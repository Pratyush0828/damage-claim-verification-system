import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.ai.image_analyzer import image_analyzer
from app.ai.nlp_analyzer import nlp_analyzer
from app.models import ObjectType, User
from app.schemas.claim import FraudCheckRequest, StandaloneNLPRequest
from app.services.fraud import calculate_fraud_result
from app.services.security import get_current_user

router = APIRouter(tags=["Analysis"])


@router.post("/images/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    object_type: ObjectType = Form(...),
    evidence_type: str = Form(...),
    _: User = Depends(get_current_user),
) -> dict:
    suffix = Path(file.filename or "image.jpg").suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(await file.read())
        path = Path(temp.name)
    try:
        return image_analyzer.analyze(path, object_type, evidence_type, file.filename or "image")
    finally:
        path.unlink(missing_ok=True)


@router.post("/nlp/analyze")
def analyze_text(
    payload: StandaloneNLPRequest, _: User = Depends(get_current_user)
) -> dict:
    return nlp_analyzer.analyze(
        payload.object_type,
        payload.description,
        [message.model_dump() for message in payload.conversation],
    )


@router.post("/fraud/check")
def check_fraud(
    payload: FraudCheckRequest, _: User = Depends(get_current_user)
) -> dict:
    return calculate_fraud_result(**payload.model_dump())

