import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database.session import get_db
from app.models import Claim, ClaimImage, ClaimReview, ConversationMessage, ObjectType, User
from app.schemas.claim import ClaimListItem, ClaimResponse, ConversationInput
from app.schemas.metrics import AccuracyMetricsResponse, ClaimReviewRequest, ClaimReviewResponse
from app.services.claim_processor import process_claim
from app.services.metrics import calculate_accuracy_metrics
from app.services.security import get_current_user
from app.services.storage import storage_service

router = APIRouter(prefix="/claims", tags=["Claims"])


@router.post("/create", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def create_claim(
    title: Annotated[str, Form()],
    object_type: Annotated[ObjectType, Form()],
    description: Annotated[str, Form()],
    evidence_types: Annotated[str, Form()],
    files: Annotated[list[UploadFile], File()],
    incident_date: Annotated[str | None, Form()] = None,
    conversation: Annotated[str, Form()] = "[]",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Claim:
    if len(description.strip()) < 10:
        raise HTTPException(422, detail="Description must contain at least 10 characters")
    try:
        evidence_list = json.loads(evidence_types)
        conversation_list = [ConversationInput.model_validate(item) for item in json.loads(conversation)]
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(422, detail="Evidence types or conversation JSON is invalid") from exc
    if len(files) != len(evidence_list):
        raise HTTPException(422, detail="Each uploaded image must have an evidence type")
    if not files:
        raise HTTPException(422, detail="At least one image is required")

    claim = Claim(
        user_id=user.id,
        title=title.strip(),
        object_type=object_type,
        description=description.strip(),
        incident_date=incident_date,
    )
    db.add(claim)
    db.flush()

    image_paths = {}
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    for upload, evidence_type in zip(files, evidence_list, strict=True):
        if upload.content_type not in allowed_types:
            raise HTTPException(415, detail=f"{upload.filename}: only JPG, PNG, and WebP are accepted")
        storage_key, url = storage_service.save(upload, user.id, claim.id)
        image = ClaimImage(
            claim_id=claim.id,
            file_name=upload.filename or "claim-image",
            storage_key=storage_key,
            url=url,
            content_type=upload.content_type or "image/jpeg",
            evidence_type=evidence_type,
        )
        db.add(image)
        db.flush()
        path = storage_service.local_path(storage_key)
        if path:
            if path.stat().st_size > settings.max_upload_mb * 1024 * 1024:
                path.unlink(missing_ok=True)
                raise HTTPException(413, detail=f"{upload.filename} exceeds the upload limit")
            image_paths[image.id] = path

    for index, message in enumerate(conversation_list):
        db.add(
            ConversationMessage(
                claim_id=claim.id,
                role=message.role,
                content=message.content,
                sequence=index,
            )
        )
    db.commit()
    claim = _get_claim(db, claim.id, user.id)
    return process_claim(db, claim, user, image_paths)


@router.get("", response_model=list[ClaimListItem])
def list_claims(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Claim]:
    return list(
        db.scalars(
            select(Claim).where(Claim.user_id == user.id).order_by(Claim.created_at.desc())
        )
    )


@router.get("/metrics/accuracy", response_model=AccuracyMetricsResponse)
def accuracy_metrics(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return calculate_accuracy_metrics(db, user.id)


@router.post("/{claim_id}/review", response_model=ClaimReviewResponse)
def review_claim(
    claim_id: str,
    payload: ClaimReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ClaimReviewResponse:
    claim = _get_claim(db, claim_id, user.id)
    if not claim.decision:
        raise HTTPException(409, detail="Claim analysis is not complete")
    review = db.scalar(select(ClaimReview).where(ClaimReview.claim_id == claim.id))
    if review:
        review.actual_decision = payload.actual_decision
        review.notes = payload.notes.strip()
        review.predicted_decision = claim.decision
    else:
        review = ClaimReview(
            claim_id=claim.id,
            reviewer_id=user.id,
            predicted_decision=claim.decision,
            actual_decision=payload.actual_decision,
            notes=payload.notes.strip(),
        )
        db.add(review)
    db.commit()
    return ClaimReviewResponse(
        claim_id=claim.id,
        predicted_decision=claim.decision,
        actual_decision=review.actual_decision,
        correct=claim.decision == review.actual_decision,
        notes=review.notes,
    )


@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Claim:
    return _get_claim(db, claim_id, user.id)


def _get_claim(db: Session, claim_id: str, user_id: str) -> Claim:
    claim = db.scalar(
        select(Claim)
        .where(Claim.id == claim_id, Claim.user_id == user_id)
        .options(
            selectinload(Claim.images),
            selectinload(Claim.conversations),
            selectinload(Claim.fraud_report),
        )
    )
    if not claim:
        raise HTTPException(404, detail="Claim not found")
    return claim
