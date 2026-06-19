import enum
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def uuid4_str() -> str:
    return str(uuid.uuid4())


class ObjectType(str, enum.Enum):
    car = "car"
    laptop = "laptop"
    package = "package"


class ClaimStatus(str, enum.Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ClaimDecision(str, enum.Enum):
    valid = "Valid"
    suspicious = "Suspicious"
    fraudulent = "Fraudulent"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    claims: Mapped[list["Claim"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    object_type: Mapped[ObjectType] = mapped_column(Enum(ObjectType))
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    incident_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[ClaimStatus] = mapped_column(Enum(ClaimStatus), default=ClaimStatus.processing)
    decision: Mapped[ClaimDecision | None] = mapped_column(Enum(ClaimDecision), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0)
    fraud_probability: Mapped[float] = mapped_column(Float, default=0)
    trust_score: Mapped[float] = mapped_column(Float, default=0)
    image_score: Mapped[float] = mapped_column(Float, default=0)
    nlp_score: Mapped[float] = mapped_column(Float, default=0)
    history_score: Mapped[float] = mapped_column(Float, default=0)
    evidence_score: Mapped[float] = mapped_column(Float, default=0)
    missing_evidence: Mapped[list[str]] = mapped_column(JSON, default=list)
    extracted_insights: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    reasoning_summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="claims")
    images: Mapped[list["ClaimImage"]] = relationship(back_populates="claim", cascade="all, delete-orphan")
    conversations: Mapped[list["ConversationMessage"]] = relationship(
        back_populates="claim", cascade="all, delete-orphan"
    )
    fraud_report: Mapped["FraudReport | None"] = relationship(
        back_populates="claim", cascade="all, delete-orphan", uselist=False
    )


class ClaimImage(Base):
    __tablename__ = "claim_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(1000))
    content_type: Mapped[str] = mapped_column(String(100))
    evidence_type: Mapped[str] = mapped_column(String(80), default="damage")
    detected_object: Mapped[str | None] = mapped_column(String(80), nullable=True)
    damage_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    severity: Mapped[str] = mapped_column(String(30), default="unknown")
    quality_score: Mapped[float] = mapped_column(Float, default=0)
    embedding: Mapped[list[float]] = mapped_column(JSON, default=list)
    analysis: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    claim: Mapped[Claim] = relationship(back_populates="images")


class ConversationMessage(Base):
    __tablename__ = "claim_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    claim: Mapped[Claim] = relationship(back_populates="conversations")


class ClaimHistory(Base):
    __tablename__ = "claim_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    claim_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    event_type: Mapped[str] = mapped_column(String(80))
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FraudReport(Base):
    __tablename__ = "fraud_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), unique=True)
    fraud_probability: Mapped[float] = mapped_column(Float)
    trust_score: Mapped[float] = mapped_column(Float)
    decision: Mapped[ClaimDecision] = mapped_column(Enum(ClaimDecision))
    signals: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    model_version: Mapped[str] = mapped_column(String(50), default="ensemble-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    claim: Mapped[Claim] = relationship(back_populates="fraud_report")


class EvidenceRequirement(Base):
    __tablename__ = "evidence_requirements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    object_type: Mapped[ObjectType] = mapped_column(Enum(ObjectType), index=True)
    evidence_type: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300))
    minimum_count: Mapped[int] = mapped_column(Integer, default=1)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)


class ClaimReview(Base):
    __tablename__ = "claim_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id"), unique=True, index=True)
    reviewer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    predicted_decision: Mapped[ClaimDecision] = mapped_column(Enum(ClaimDecision))
    actual_decision: Mapped[ClaimDecision] = mapped_column(Enum(ClaimDecision))
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
