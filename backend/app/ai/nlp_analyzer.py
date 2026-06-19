import re
from datetime import datetime
from typing import Any

from app.ai.local_models import local_models
from app.models import ObjectType


DAMAGE_TERMS = {
    ObjectType.car: {"dent", "scratch", "collision", "crash", "bumper", "broken", "impact", "glass"},
    ObjectType.laptop: {"crack", "screen", "liquid", "spill", "hinge", "keyboard", "broken", "dropped"},
    ObjectType.package: {"crushed", "torn", "wet", "opened", "missing", "broken", "damaged", "dent"},
}
UNCERTAINTY = {"maybe", "probably", "not sure", "i think", "perhaps", "somehow"}
HIGH_RISK = {"staged", "fake", "reused", "edited", "photoshop", "sell it", "cash only"}


class NLPAnalyzer:
    def analyze(
        self, object_type: ObjectType, description: str, conversation: list[dict[str, str]]
    ) -> dict[str, Any]:
        combined = " ".join([description] + [item.get("content", "") for item in conversation])
        lowered = combined.lower()
        words = re.findall(r"\b[\w'-]+\b", lowered)

        dates = re.findall(
            r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|"
            r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2})\b",
            lowered,
        )
        times = re.findall(r"\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b", lowered)
        locations = re.findall(r"\b(?:at|near|in)\s+([A-Z]?[a-z]+(?:\s+[A-Z]?[a-z]+){0,3})", combined)
        matched_damage = sorted(term for term in DAMAGE_TERMS[object_type] if term in lowered)
        uncertainty_hits = sorted(term for term in UNCERTAINTY if term in lowered)
        risk_hits = sorted(term for term in HIGH_RISK if term in lowered)

        detail_score = min(100, len(words) * 1.2 + len(dates) * 12 + len(times) * 8 + len(locations) * 6)
        relevance_score = min(100, 40 + len(matched_damage) * 12) if matched_damage else 35
        penalty = len(uncertainty_hits) * 7 + len(risk_hits) * 25
        consistency_score = round(max(0, min(100, detail_score * 0.45 + relevance_score * 0.55 - penalty)), 1)

        contradictions: list[str] = []
        if "did not drop" in lowered and ("dropped it" in lowered or "i dropped" in lowered):
            contradictions.append("The account both denies and reports dropping the item.")
        if "no damage" in lowered and any(term in lowered for term in ("broken", "cracked", "crushed", "dent")):
            contradictions.append("The narrative says there was no damage but also describes damage.")
        if len(set(dates)) > 1:
            contradictions.append("Multiple incident dates appear in the submitted narrative.")
        consistency_score = max(0, consistency_score - len(contradictions) * 18)
        sentence_embedding = local_models.text_embedding(combined)

        return {
            "consistency_score": round(consistency_score, 1),
            "incident_details": {
                "dates": dates,
                "times": times,
                "locations": locations[:5],
                "damage_terms": matched_damage,
            },
            "contradictions": contradictions,
            "uncertainty_phrases": uncertainty_hits,
            "risk_phrases": risk_hits,
            "word_count": len(words),
            "sentence_embedding": sentence_embedding,
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
            "provider": (
                "rule-based-nlp + sentence-transformers"
                if sentence_embedding
                else "rule-based-nlp"
            ),
        }


nlp_analyzer = NLPAnalyzer()
