import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models import ClaimDecision, ClaimStatus, ObjectType


class ConversationInput(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class ClaimCreateMetadata(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    object_type: ObjectType
    description: str = Field(min_length=10, max_length=10000)
    incident_date: str | None = None
    evidence_types: list[str]
    conversation: list[ConversationInput] = []

    @field_validator("evidence_types", mode="before")
    @classmethod
    def parse_evidence_types(cls, value: Any) -> Any:
        return json.loads(value) if isinstance(value, str) else value


class ImageResponse(BaseModel):
    id: str
    file_name: str
    url: str
    evidence_type: str
    detected_object: str | None
    damage_detected: bool
    severity: str
    quality_score: float
    analysis: dict[str, Any]

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    role: str
    content: str
    sequence: int

    model_config = {"from_attributes": True}


class FraudReportResponse(BaseModel):
    fraud_probability: float
    trust_score: float
    decision: ClaimDecision
    signals: list[dict[str, Any]]
    model_version: str

    model_config = {"from_attributes": True}


class ClaimResponse(BaseModel):
    id: str
    object_type: ObjectType
    title: str
    description: str
    incident_date: str | None
    status: ClaimStatus
    decision: ClaimDecision | None
    confidence_score: float
    fraud_probability: float
    trust_score: float
    image_score: float
    nlp_score: float
    history_score: float
    evidence_score: float
    missing_evidence: list[str]
    extracted_insights: dict[str, Any]
    reasoning_summary: str
    images: list[ImageResponse] = []
    conversations: list[ConversationResponse] = []
    fraud_report: FraudReportResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClaimListItem(BaseModel):
    id: str
    object_type: ObjectType
    title: str
    status: ClaimStatus
    decision: ClaimDecision | None
    confidence_score: float
    fraud_probability: float
    missing_evidence: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class StandaloneNLPRequest(BaseModel):
    object_type: ObjectType
    description: str = Field(min_length=10)
    conversation: list[ConversationInput] = []


class FraudCheckRequest(BaseModel):
    image_score: float = Field(ge=0, le=100)
    nlp_score: float = Field(ge=0, le=100)
    history_score: float = Field(ge=0, le=100)
    evidence_score: float = Field(ge=0, le=100)

