from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.models.schemas import (
    EvaluationRequest,
    EvaluationResponseWithId,
    FollowUpRequest,
    FollowUpResponse,
    InterviewSessionOut,
)
from app.models.database import SessionLocal, User, InterviewSession, FollowUpExchange
from app.core.auth import get_current_user
from app.services.gemini import evaluate_behavioral_response, evaluate_follow_up_response

MAX_FOLLOW_UP_TURNS = 3

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# DB dependency
# ──────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# POST /evaluate  — Initial evaluation
# ──────────────────────────────────────────────────────────────

@router.post("/evaluate", response_model=EvaluationResponseWithId)
async def evaluate_interview(
    request: EvaluationRequest,
    clerk_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # 1. Call the AI
        response_data = await evaluate_behavioral_response(
            question=request.question_text,
            user_response=request.user_response,
        )

        # 2. Sync User to DB — create on first login
        user = db.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            user = User(clerk_id=clerk_id, email=f"{clerk_id}@placeholder.com")
            db.add(user)
            db.commit()
            db.refresh(user)

        # 3. Persist the interview session
        db_session = InterviewSession(
            user_id=user.id,
            question_id=request.question_id,
            question_text=request.question_text,
            user_response=request.user_response,
            clarity_score=response_data.clarity_score,
            star_method_score=response_data.star_method_score,
            impact_score=response_data.impact_score,
            overall_score=response_data.overall_score,
            feedback=response_data.feedback,
            improvement_tip=response_data.improvement_tip,
            follow_up_question=response_data.follow_up_question,
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)

        # 4. Return with session_id for follow-up chaining
        return EvaluationResponseWithId(
            **response_data.model_dump(),
            session_id=db_session.id,
        )

    except Exception as e:
        print(f"Error during evaluation: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during evaluation")


# ──────────────────────────────────────────────────────────────
# POST /evaluate/follow-up  — Multi-turn conversation
# ──────────────────────────────────────────────────────────────

@router.post("/evaluate/follow-up", response_model=FollowUpResponse)
async def evaluate_follow_up(
    request: FollowUpRequest,
    clerk_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluates a follow-up answer with full conversation context."""
    try:
        # 1. Validate user exists
        user = db.query(User).filter(User.clerk_id == clerk_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 2. Validate parent session exists and belongs to this user
        parent_session = (
            db.query(InterviewSession)
            .options(joinedload(InterviewSession.follow_ups))
            .filter(
                InterviewSession.id == request.session_id,
                InterviewSession.user_id == user.id,
            )
            .first()
        )
        if not parent_session:
            raise HTTPException(
                status_code=404, detail="Interview session not found or unauthorized"
            )

        # Fix D: Explicitly sort follow_ups by turn_number after joinedload
        sorted_follow_ups = sorted(parent_session.follow_ups, key=lambda fu: fu.turn_number)

        # 3. Guard: reject if conversation already finalized
        if sorted_follow_ups and sorted_follow_ups[-1].is_final:
            raise HTTPException(status_code=400, detail="Conversation already finalized")

        # 4. Determine next turn number
        existing_turns = len(sorted_follow_ups)
        next_turn = existing_turns + 1

        if next_turn > MAX_FOLLOW_UP_TURNS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum follow-up depth ({MAX_FOLLOW_UP_TURNS}) already reached",
            )

        # 5. Build conversation history context string
        history_lines = [
            f"[Initial Answer]: {parent_session.user_response}",
            f"[AI Feedback]: {parent_session.feedback}",
        ]
        for exchange in sorted_follow_ups:
            history_lines.append(f"[Follow-Up Q{exchange.turn_number}]: {exchange.ai_question}")
            history_lines.append(f"[Candidate A{exchange.turn_number}]: {exchange.user_response}")
            history_lines.append(f"[AI Feedback {exchange.turn_number}]: {exchange.feedback}")

        conversation_history = "\n".join(history_lines)

        # 6. Call the AI with full context
        ai_response = await evaluate_follow_up_response(
            original_question=parent_session.question_text,
            conversation_history=conversation_history,
            follow_up_question=request.follow_up_question,
            user_response=request.user_response,
            turn_number=next_turn,
            max_turns=MAX_FOLLOW_UP_TURNS,
        )

        # 7. Persist the exchange
        new_exchange = FollowUpExchange(
            session_id=parent_session.id,
            turn_number=next_turn,
            ai_question=request.follow_up_question,
            user_response=request.user_response,
            feedback=ai_response.feedback,
            score=ai_response.score,
            is_final=ai_response.is_final,
        )
        db.add(new_exchange)
        db.commit()

        return ai_response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during follow-up evaluation: {e}")
        raise HTTPException(
            status_code=500, detail="Internal Server Error during follow-up evaluation"
        )


# ──────────────────────────────────────────────────────────────
# GET /history  — Fetch all sessions for the current user
# ──────────────────────────────────────────────────────────────

@router.get("/history", response_model=List[InterviewSessionOut])
def get_history(
    clerk_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        return []

    sessions = (
        db.query(InterviewSession)
        .options(joinedload(InterviewSession.follow_ups))
        .filter(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    # Fix C: Use Pydantic schema instead of fragile manual dict serialization
    result = []
    for s in sessions:
        # Serialize created_at to ISO string before Pydantic validation
        session_data = {
            "id": s.id,
            "question_id": s.question_id,
            "question_text": s.question_text,
            "user_response": s.user_response,
            "clarity_score": s.clarity_score,
            "star_method_score": s.star_method_score,
            "impact_score": s.impact_score,
            "overall_score": s.overall_score,
            "feedback": s.feedback,
            "improvement_tip": s.improvement_tip,
            "follow_up_question": s.follow_up_question,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "follow_ups": sorted(
                [
                    {
                        "turn_number": fu.turn_number,
                        "ai_question": fu.ai_question,
                        "user_response": fu.user_response,
                        "feedback": fu.feedback,
                        "score": fu.score,
                        "is_final": fu.is_final,
                    }
                    for fu in s.follow_ups
                ],
                key=lambda x: x["turn_number"],  # Fix D: explicit sort in history too
            ),
        }
        result.append(InterviewSessionOut(**session_data))

    return result


# ──────────────────────────────────────────────────────────────
# DELETE /history/{session_id}
# ──────────────────────────────────────────────────────────────

@router.delete("/history/{session_id}")
def delete_interview(
    session_id: int,
    clerk_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview not found or unauthorized")

    # follow_ups cascade-delete automatically via the ORM relationship
    db.delete(session)
    db.commit()

    return {"message": "Successfully deleted"}