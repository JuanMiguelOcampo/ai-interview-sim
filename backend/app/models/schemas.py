from pydantic import BaseModel

class EvaluationRequest(BaseModel):
    user_id: int
    question_id: int
    question_text: str
    user_response: str

class EvaluationResponse(BaseModel):
    clarity_score: int
    star_method_score: int
    impact_score: int
    overall_score: int
    feedback: str
    improvement_tip: str
    follow_up_question: str  