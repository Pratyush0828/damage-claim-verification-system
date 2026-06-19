from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import settings


class LocalModelSuite:
    """Lazy optional ML providers. Heavy dependencies load only when explicitly enabled."""

    @lru_cache(maxsize=1)
    def _clip(self):
        from transformers import CLIPModel, CLIPProcessor

        model_name = "openai/clip-vit-base-patch32"
        return CLIPModel.from_pretrained(model_name), CLIPProcessor.from_pretrained(model_name)

    @lru_cache(maxsize=1)
    def _efficientnet(self):
        from torchvision.models import EfficientNet_B0_Weights, efficientnet_b0

        weights = EfficientNet_B0_Weights.DEFAULT
        model = efficientnet_b0(weights=weights)
        model.classifier = __import__("torch").nn.Identity()
        model.eval()
        return model, weights.transforms()

    @lru_cache(maxsize=1)
    def _sentence_model(self):
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer("all-MiniLM-L6-v2")

    def analyze_image(self, path: Path, expected_object: str) -> dict[str, Any]:
        if not settings.enable_local_ml:
            return {}
        import torch
        from PIL import Image

        image = Image.open(path).convert("RGB")
        labels = [
            f"a photo of a damaged {expected_object}",
            f"a photo of an undamaged {expected_object}",
            "an unrelated object",
        ]
        clip_model, processor = self._clip()
        inputs = processor(text=labels, images=image, return_tensors="pt", padding=True)
        with torch.no_grad():
            probabilities = clip_model(**inputs).logits_per_image.softmax(dim=1)[0]

        efficientnet, transform = self._efficientnet()
        with torch.no_grad():
            features = efficientnet(transform(image).unsqueeze(0))[0]
        compact_features = torch.nn.functional.adaptive_avg_pool1d(
            features.reshape(1, 1, -1), 32
        ).flatten()
        return {
            "clip_damage_probability": round(float(probabilities[0]) * 100, 1),
            "clip_object_match": round(float((probabilities[0] + probabilities[1])) * 100, 1),
            "efficientnet_embedding": [round(float(value), 5) for value in compact_features],
            "ml_provider": "CLIP + EfficientNet-B0",
        }

    def text_embedding(self, text: str) -> list[float]:
        if not settings.enable_local_ml:
            return []
        vector = self._sentence_model().encode(text, normalize_embeddings=True)
        return [round(float(value), 6) for value in vector]


local_models = LocalModelSuite()

