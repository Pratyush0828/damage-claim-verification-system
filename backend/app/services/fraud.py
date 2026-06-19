from typing import Any
from statistics import pstdev

from app.models import ClaimDecision


WEIGHTS = {
    "image": 0.30,
    "nlp": 0.25,
    "history": 0.25,
    "evidence": 0.20,
}


def calculate_fraud_result(
    image_score: float,
    nlp_score: float,
    history_score: float,
    evidence_score: float,
    contradictions: list[str] | None = None,
    duplicate_matches: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    trust_score = (
        image_score * WEIGHTS["image"]
        + nlp_score * WEIGHTS["nlp"]
        + history_score * WEIGHTS["history"]
        + evidence_score * WEIGHTS["evidence"]
    )
    contradictions = contradictions or []
    duplicate_matches = duplicate_matches or []
    trust_score -= min(20, len(contradictions) * 10)
    trust_score -= min(20, len(duplicate_matches) * 10)
    trust_score = round(max(0, min(100, trust_score)), 1)
    fraud_probability = round(100 - trust_score, 1)

    if fraud_probability >= 70:
        decision = ClaimDecision.fraudulent
    elif fraud_probability >= 38:
        decision = ClaimDecision.suspicious
    else:
        decision = ClaimDecision.valid

    distance_to_boundary = min(abs(fraud_probability - 38), abs(fraud_probability - 70))
    scores = [image_score, nlp_score, history_score, evidence_score]
    agreement = max(0.0, 100 - pstdev(scores) * 2.2)
    data_quality = image_score * 0.4 + evidence_score * 0.35 + nlp_score * 0.25
    boundary_certainty = min(100.0, 45 + distance_to_boundary * 2.0)
    confidence = round(
        max(25, min(96, agreement * 0.45 + data_quality * 0.35 + boundary_certainty * 0.20)),
        1,
    )
    reliability_label = "High" if confidence >= 78 else "Moderate" if confidence >= 55 else "Low"

    signals = [
        _signal("image", image_score, "Visual evidence quality and damage alignment"),
        _signal("nlp", nlp_score, "Narrative detail and internal consistency"),
        _signal("history", history_score, "Claimant history and duplicate risk"),
        _signal("evidence", evidence_score, "Required evidence completeness"),
    ]
    signals.extend(
        {"name": "contradiction", "severity": "high", "detail": item} for item in contradictions
    )
    signals.extend(
        {
            "name": "possible_duplicate",
            "severity": "high",
            "detail": f"Similar to prior claim {item['claim_id']} ({item['similarity']:.0%}).",
        }
        for item in duplicate_matches
    )
    return {
        "trust_score": trust_score,
        "fraud_probability": fraud_probability,
        "decision": decision,
        "confidence_score": confidence,
        "reliability": {
            "score": confidence,
            "label": reliability_label,
            "signal_agreement": round(agreement, 1),
            "data_quality": round(data_quality, 1),
            "boundary_certainty": round(boundary_certainty, 1),
            "explanation": (
                "Signals strongly agree and the submitted evidence is sufficiently complete."
                if reliability_label == "High"
                else "Some analysis signals disagree or evidence quality limits certainty."
                if reliability_label == "Moderate"
                else "The prediction is uncertain because signals conflict or key evidence is weak."
            ),
        },
        "signals": signals,
    }


def _signal(name: str, score: float, detail: str) -> dict[str, Any]:
    severity = "low" if score >= 75 else "medium" if score >= 45 else "high"
    return {"name": name, "score": round(score, 1), "severity": severity, "detail": detail}
