from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Claim, ClaimDecision, User


def analyze_user_history(db: Session, user: User, description: str, current_claim_id: str) -> dict:
    claims = list(
        db.scalars(
            select(Claim)
            .where(Claim.user_id == user.id, Claim.id != current_claim_id)
            .order_by(Claim.created_at.desc())
        )
    )
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    recent = [claim for claim in claims if _aware(claim.created_at) >= recent_cutoff]
    fraudulent = sum(claim.decision == ClaimDecision.fraudulent for claim in claims)

    current_tokens = _meaningful_tokens(description)
    duplicate_matches: list[dict] = []
    for claim in claims:
        previous_tokens = _meaningful_tokens(claim.description)
        union = current_tokens | previous_tokens
        similarity = len(current_tokens & previous_tokens) / len(union) if union else 0
        if similarity >= 0.62:
            duplicate_matches.append(
                {"claim_id": claim.id, "title": claim.title, "similarity": round(similarity, 2)}
            )

    frequency_penalty = max(0, (len(recent) - 2) * 12)
    fraud_penalty = fraudulent * 25
    duplicate_penalty = min(35, len(duplicate_matches) * 20)
    risk_score = min(100, frequency_penalty + fraud_penalty + duplicate_penalty)
    trust_score = round(100 - risk_score, 1)
    return {
        "score": trust_score,
        "risk_score": risk_score,
        "total_previous_claims": len(claims),
        "claims_last_90_days": len(recent),
        "previous_fraudulent_claims": fraudulent,
        "duplicate_matches": duplicate_matches,
        "unusual_frequency": len(recent) >= 4,
    }


def _meaningful_tokens(text: str) -> set[str]:
    stop = {"the", "and", "was", "with", "this", "that", "from", "have", "after", "when"}
    return {word.strip(".,!?").lower() for word in text.split() if len(word) > 3 and word not in stop}


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

