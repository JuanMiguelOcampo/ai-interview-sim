from pydantic import BaseModel, Field, model_validator
from typing import Optional, List


# ──────────────────────────────────────────────────────────────
# Auth / User Schemas
# ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    clerk_id: str
    email: str


# ──────────────────────────────────────────────────────────────
# Initial Evaluation Schemas
# ──────────────────────────────────────────────────────────────

class EvaluationRequest(BaseModel):
    question_id: int
    question_text: str = Field(..., min_length=10, max_length=500)
    user_response: str = Field(
        ...,
        min_length=20,   # Aligned with the UI's 20-char guard
        max_length=5000,
        description="The STT transcript of the candidate's answer",
    )


class EvaluationResponse(BaseModel):
    # Fix A: strict 0-100 bounds on all score fields
    clarity_score: int = Field(..., ge=0, le=100)
    star_method_score: int = Field(..., ge=0, le=100)
    impact_score: int = Field(..., ge=0, le=100)
    overall_score: int = Field(..., ge=0, le=100)
    feedback: str
    improvement_tip: str
    follow_up_question: str


class EvaluationResponseWithId(EvaluationResponse):
    """Extends EvaluationResponse with the persisted session ID for follow-up chaining."""
    session_id: int


# ──────────────────────────────────────────────────────────────
# Follow-Up Conversation Schemas
# ──────────────────────────────────────────────────────────────

class FollowUpRequest(BaseModel):
    """Sent when the user answers an AI follow-up question."""
    session_id: int
    follow_up_question: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="The AI-generated follow-up question the user is answering",
    )
    user_response: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="The user's answer to the AI's follow-up question",
    )


class FollowUpExchangeOut(BaseModel):
    """Represents a single follow-up exchange in the conversation thread."""
    turn_number: int
    ai_question: str
    user_response: str
    feedback: str
    score: Optional[int] = Field(None, ge=0, le=100)
    is_final: bool

    model_config = {"from_attributes": True}


class FollowUpResponse(BaseModel):
    """Response from the /evaluate/follow-up endpoint."""
    feedback: str
    score: Optional[int] = Field(None, ge=0, le=100)
    is_final: bool
    next_question: Optional[str] = None
    turn_number: int

    # Fix F: enforce mutual exclusivity — if is_final, score must be set
    @model_validator(mode="after")
    def check_final_has_score(self) -> "FollowUpResponse":
        if self.is_final and self.score is None:
            raise ValueError(
                "FollowUpResponse: 'score' must be an integer when 'is_final' is True."
            )
        if not self.is_final and self.score is not None:
            raise ValueError(
                "FollowUpResponse: 'score' must be null when 'is_final' is False."
            )
        return self


# ──────────────────────────────────────────────────────────────
# History Response Schemas  (Fix C — replaces raw dict)
# ──────────────────────────────────────────────────────────────

class InterviewSessionOut(BaseModel):
    """Full session representation returned by GET /history."""
    id: int
    question_id: Optional[int] = None
    question_text: str
    user_response: str
    clarity_score: int = Field(..., ge=0, le=100)
    star_method_score: int = Field(..., ge=0, le=100)
    impact_score: int = Field(..., ge=0, le=100)
    overall_score: int = Field(..., ge=0, le=100)
    feedback: str
    improvement_tip: str
    follow_up_question: Optional[str] = None
    created_at: Optional[str] = None
    follow_ups: List[FollowUpExchangeOut] = []

    model_config = {"from_attributes": True}