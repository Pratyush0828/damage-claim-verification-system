from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EvidenceRequirement, ObjectType
from app.services.evidence import REQUIREMENTS


def seed_evidence_requirements(db: Session) -> None:
    if db.scalar(select(EvidenceRequirement.id).limit(1)):
        return
    for object_type, requirements in REQUIREMENTS.items():
        for item in requirements:
            db.add(
                EvidenceRequirement(
                    object_type=object_type,
                    evidence_type=item.key,
                    label=item.label,
                    description=item.description,
                )
            )
    db.commit()
