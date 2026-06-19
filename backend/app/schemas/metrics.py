from pydantic import BaseModel, Field

from app.models import ClaimDecision


class ClaimReviewRequest(BaseModel):
    actual_decision: ClaimDecision
    notes: str = Field(default="", max_length=2000)


class ClaimReviewResponse(BaseModel):
    claim_id: str
    predicted_decision: ClaimDecision
    actual_decision: ClaimDecision
    correct: bool
    notes: str


class AccuracyMetricsResponse(BaseModel):
    reviewed_claims: int
    correct_predictions: int
    accuracy: float | None
    macro_precision: float | None
    macro_recall: float | None
    macro_f1: float | None
    class_metrics: dict[str, dict[str, float | int]]
    message: str
