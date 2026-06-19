import base64
import hashlib
import io
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter, ImageStat

from app.ai.local_models import local_models
from app.config import settings
from app.models import ObjectType


EVIDENCE_HINTS = {
    ObjectType.car: {
        "front": ["front", "bumper", "hood", "windshield"],
        "rear": ["rear", "back", "trunk", "tail"],
        "damage_closeup": ["damage", "close", "dent", "scratch", "crack"],
    },
    ObjectType.laptop: {
        "full_laptop": ["full", "laptop", "device", "open"],
        "damaged_area": ["damage", "screen", "crack", "hinge", "keyboard"],
        "serial_number": ["serial", "label", "number", "sticker"],
    },
    ObjectType.package: {
        "package": ["package", "box", "parcel"],
        "shipping_label": ["shipping", "label", "address", "tracking"],
        "damage": ["damage", "crush", "tear", "wet", "dent"],
    },
}


class ImageAnalyzer:
    def analyze(
        self,
        image_path: Path,
        expected_object: ObjectType,
        evidence_type: str,
        file_name: str,
    ) -> dict[str, Any]:
        if settings.openai_api_key:
            try:
                return self._analyze_with_openai(image_path, expected_object, evidence_type)
            except Exception:
                # Claims should remain processable if an external model is temporarily unavailable.
                pass
        return self._analyze_locally(image_path, expected_object, evidence_type, file_name)

    def _analyze_locally(
        self, image_path: Path, expected_object: ObjectType, evidence_type: str, file_name: str
    ) -> dict[str, Any]:
        with Image.open(image_path) as raw:
            image = raw.convert("RGB")
            width, height = image.size
            stat = ImageStat.Stat(image)
            brightness = sum(stat.mean) / 3
            contrast = sum(stat.stddev) / 3
            edges = image.convert("L").filter(ImageFilter.FIND_EDGES)
            edge_mean = ImageStat.Stat(edges).mean[0]

        megapixels = (width * height) / 1_000_000
        resolution_score = min(100.0, megapixels / 2 * 100)
        exposure_score = max(0.0, 100 - abs(brightness - 128) * 0.7)
        sharpness_score = min(100.0, edge_mean * 4.2)
        quality = round(0.45 * resolution_score + 0.25 * exposure_score + 0.30 * sharpness_score, 1)

        normalized_name = file_name.lower().replace("-", "_").replace(" ", "_")
        hints = EVIDENCE_HINTS[expected_object].get(evidence_type, [])
        semantic_hint = any(hint in normalized_name for hint in hints)
        damage_evidence = evidence_type in {"damage", "damage_closeup", "damaged_area"}
        damage_signal = min(100.0, contrast * 1.7 + edge_mean * 1.2)
        damage_detected = bool(damage_evidence and (damage_signal >= 42 or semantic_hint))
        severity = "none"
        if damage_detected:
            severity = "severe" if damage_signal >= 78 else "moderate" if damage_signal >= 55 else "minor"

        digest = hashlib.sha256(image_path.read_bytes()).digest()
        embedding = [round((byte / 255) * 2 - 1, 5) for byte in digest[:32]]
        ml_result = local_models.analyze_image(image_path, expected_object.value)
        if ml_result:
            damage_detected = ml_result["clip_damage_probability"] >= 55
            embedding = ml_result.pop("efficientnet_embedding")
            if damage_detected and severity == "none":
                severity = "moderate" if ml_result["clip_damage_probability"] >= 75 else "minor"
        return {
            "detected_object": expected_object.value,
            "object_match": True,
            "damage_detected": damage_detected,
            "severity": severity,
            "quality_score": quality,
            "evidence_match": semantic_hint or quality >= 35,
            "evidence_type": evidence_type,
            "dimensions": {"width": width, "height": height},
            "embedding": embedding,
            "provider": ml_result.pop("ml_provider", "local-vision-fallback"),
            "local_ml": ml_result,
            "observations": [
                f"Image quality is {'acceptable' if quality >= 50 else 'low'} ({quality:.0f}/100).",
                f"Submitted as {evidence_type.replace('_', ' ')} evidence.",
                (
                    f"Visual texture indicates {severity} visible damage."
                    if damage_detected
                    else "No reliable visible-damage signal was found in this image."
                ),
            ],
        }

    def _analyze_with_openai(
        self, image_path: Path, expected_object: ObjectType, evidence_type: str
    ) -> dict[str, Any]:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
        encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
        prompt = f"""Inspect this insurance evidence image. Expected object: {expected_object.value}.
Evidence slot: {evidence_type}. Return strict JSON with keys:
detected_object, object_match (boolean), damage_detected (boolean),
severity (none|minor|moderate|severe), quality_score (0-100),
evidence_match (boolean), observations (array of concise strings).
Do not infer facts that are not visible."""
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "image_url": f"data:{mime};base64,{encoded}"},
                    ],
                }
            ],
        )
        text = response.output_text.strip().removeprefix("```json").removesuffix("```").strip()
        result = json.loads(text)
        result["provider"] = "openai"
        result["embedding"] = self._hash_embedding(image_path.read_bytes())
        return result

    @staticmethod
    def _hash_embedding(content: bytes) -> list[float]:
        digest = hashlib.sha256(content).digest()
        norm = math.sqrt(sum((b - 127.5) ** 2 for b in digest)) or 1
        return [round((b - 127.5) / norm, 6) for b in digest]


image_analyzer = ImageAnalyzer()
