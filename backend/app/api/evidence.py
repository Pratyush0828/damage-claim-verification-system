from fastapi import APIRouter

from app.models import ObjectType
from app.services.evidence import REQUIREMENTS

router = APIRouter(prefix="/evidence-requirements", tags=["Evidence"])


@router.get("")
def evidence_requirements() -> dict:
    return {
        object_type.value: [
            {"key": item.key, "label": item.label, "description": item.description}
            for item in requirements
        ]
        for object_type, requirements in REQUIREMENTS.items()
    }


@router.get("/{object_type}")
def evidence_requirements_for_type(object_type: ObjectType) -> list[dict]:
    return [
        {"key": item.key, "label": item.label, "description": item.description}
        for item in REQUIREMENTS[object_type]
    ]

