from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import EvaluationRequest, EvaluationResponse
from app.models.database import Attempt, get_db
from app.services.gemini import evaluate_behavioral_response

router = APIRouter()

@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate_response(request: EvaluationRequest, db: Session = Depends(get_db)):
    try:
        # 1. Get AI Evaluation
        evaluation = evaluate_behavioral_response(
            question=request.question_text,
            user_response=request.user_response
        )

        # 2. Save to Database
        new_attempt = Attempt(
            user_id=request.user_id,
            question_id=request.question_id,
            user_response=request.user_response,
            ai_feedback=evaluation.model_dump(),
            overall_score=evaluation.overall_score
        )
        db.add(new_attempt)
        db.commit()
        db.refresh(new_attempt)

        return evaluation

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ... (Keep your existing imports and the @router.post("/evaluate") function) ...

@router.get("/history")
def get_user_history(user_id: int = 1, db: Session = Depends(get_db)):
    try:
        # Query the database for all attempts by this user
        # .order_by(Attempt.id.desc()) ensures the newest attempts show up first
        attempts = db.query(Attempt)\
            .filter(Attempt.user_id == user_id)\
            .order_by(Attempt.id.desc())\
            .all()
            
        return attempts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")