from pathlib import Path

from sqlalchemy.orm import Session

from app.ai.image_analyzer import image_analyzer
from app.ai.nlp_analyzer import nlp_analyzer
from app.models import Claim, ClaimHistory, ClaimStatus, FraudReport, User
from app.services.evidence import validate_evidence
from app.services.fraud import calculate_fraud_result
from app.services.history import analyze_user_history


def process_claim(db: Session, claim: Claim, user: User, image_paths: dict[str, Path]) -> Claim:
    evidence = validate_evidence(claim.object_type, [image.evidence_type for image in claim.images])
    image_results = []

    for image in claim.images:
        path = image_paths.get(image.id)
        if not path:
            result = {
                "detected_object": claim.object_type.value,
                "object_match": True,
                "damage_detected": image.evidence_type in {"damage", "damage_closeup", "damaged_area"},
                "severity": "unknown",
                "quality_score": 65,
                "evidence_match": True,
                "embedding": [],
                "observations": ["Stored remotely; deferred visual analysis."],
                "provider": "deferred",
            }
        else:
            result = image_analyzer.analyze(
                path, claim.object_type, image.evidence_type, image.file_name
            )
        image.detected_object = result.get("detected_object")
        image.damage_detected = result.get("damage_detected", False)
        image.severity = result.get("severity", "unknown")
        image.quality_score = float(result.get("quality_score", 0))
        image.embedding = result.pop("embedding", [])
        image.analysis = result
        image_results.append(result)

    if image_results:
        quality = sum(item.get("quality_score", 0) for item in image_results) / len(image_results)
        matches = sum(bool(item.get("evidence_match")) for item in image_results) / len(image_results) * 100
        object_matches = sum(bool(item.get("object_match")) for item in image_results) / len(image_results) * 100
        image_score = round(quality * 0.45 + matches * 0.30 + object_matches * 0.25, 1)
    else:
        image_score = 0

    conversation = [
        {"role": message.role, "content": message.content} for message in claim.conversations
    ]
    nlp = nlp_analyzer.analyze(claim.object_type, claim.description, conversation)
    history = analyze_user_history(db, user, claim.description, claim.id)
    fraud = calculate_fraud_result(
        image_score=image_score,
        nlp_score=nlp["consistency_score"],
        history_score=history["score"],
        evidence_score=evidence["score"],
        contradictions=nlp["contradictions"],
        duplicate_matches=history["duplicate_matches"],
    )

    claim.image_score = image_score
    claim.nlp_score = nlp["consistency_score"]
    claim.history_score = history["score"]
    claim.evidence_score = evidence["score"]
    claim.missing_evidence = evidence["missing"]
    claim.extracted_insights = {
        "image_analysis": image_results,
        "nlp_analysis": nlp,
        "history_analysis": history,
        "evidence_analysis": evidence,
        "model_reliability": fraud["reliability"],
    }
    claim.trust_score = fraud["trust_score"]
    claim.fraud_probability = fraud["fraud_probability"]
    claim.decision = fraud["decision"]
    claim.confidence_score = fraud["confidence_score"]
    claim.reasoning_summary = _reasoning(claim, nlp, history)
    claim.status = ClaimStatus.completed
    claim.fraud_report = FraudReport(
        fraud_probability=fraud["fraud_probability"],
        trust_score=fraud["trust_score"],
        decision=fraud["decision"],
        signals=fraud["signals"],
    )
    db.add(
        ClaimHistory(
            user_id=user.id,
            claim_id=claim.id,
            event_type="claim_analyzed",
            metadata_json={
                "decision": claim.decision.value,
                "fraud_probability": claim.fraud_probability,
            },
        )
    )
    db.commit()
    db.refresh(claim)
    return claim


def _reasoning(claim: Claim, nlp: dict, history: dict) -> str:
    parts = [
        f"Visual evidence scored {claim.image_score:.0f}/100",
        f"the narrative consistency scored {claim.nlp_score:.0f}/100",
        f"and evidence completeness was {claim.evidence_score:.0f}%",
    ]
    if claim.missing_evidence:
        parts.append("Missing evidence: " + ", ".join(claim.missing_evidence))
    if nlp["contradictions"]:
        parts.append(f"{len(nlp['contradictions'])} narrative contradiction(s) were detected")
    if history["duplicate_matches"]:
        parts.append("The description resembles a previous claim")
    if not claim.missing_evidence and not nlp["contradictions"]:
        parts.append("No critical evidence or narrative integrity issues were found")
    return ". ".join(parts) + "."
