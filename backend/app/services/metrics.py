from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Claim, ClaimDecision, ClaimReview


def calculate_accuracy_metrics(db: Session, user_id: str) -> dict:
    reviews = list(
        db.scalars(
            select(ClaimReview)
            .join(Claim, Claim.id == ClaimReview.claim_id)
            .where(Claim.user_id == user_id)
        )
    )
    total = len(reviews)
    if total == 0:
        return {
            "reviewed_claims": 0,
            "correct_predictions": 0,
            "accuracy": None,
            "macro_precision": None,
            "macro_recall": None,
            "macro_f1": None,
            "class_metrics": {},
            "message": "Accuracy becomes measurable after reviewed outcomes are added.",
        }

    decisions = list(ClaimDecision)
    class_metrics = {}
    precision_values, recall_values, f1_values = [], [], []
    for decision in decisions:
        tp = sum(r.predicted_decision == decision and r.actual_decision == decision for r in reviews)
        fp = sum(r.predicted_decision == decision and r.actual_decision != decision for r in reviews)
        fn = sum(r.predicted_decision != decision and r.actual_decision == decision for r in reviews)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        precision_values.append(precision)
        recall_values.append(recall)
        f1_values.append(f1)
        class_metrics[decision.value] = {
            "support": sum(r.actual_decision == decision for r in reviews),
            "precision": round(precision * 100, 1),
            "recall": round(recall * 100, 1),
            "f1": round(f1 * 100, 1),
        }

    correct = sum(r.predicted_decision == r.actual_decision for r in reviews)
    return {
        "reviewed_claims": total,
        "correct_predictions": correct,
        "accuracy": round(correct / total * 100, 1),
        "macro_precision": round(sum(precision_values) / len(decisions) * 100, 1),
        "macro_recall": round(sum(recall_values) / len(decisions) * 100, 1),
        "macro_f1": round(sum(f1_values) / len(decisions) * 100, 1),
        "class_metrics": class_metrics,
        "message": f"Measured from {total} reviewer-confirmed claim outcome(s).",
    }
