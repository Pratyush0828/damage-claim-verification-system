from dataclasses import dataclass

from app.models import ObjectType


@dataclass(frozen=True)
class EvidenceItem:
    key: str
    label: str
    description: str


REQUIREMENTS: dict[ObjectType, list[EvidenceItem]] = {
    ObjectType.car: [
        EvidenceItem("front", "Front image", "A clear image showing the front of the vehicle."),
        EvidenceItem("rear", "Rear image", "A clear image showing the rear of the vehicle."),
        EvidenceItem("damage_closeup", "Damage close-up", "A close, well-lit view of the damaged area."),
    ],
    ObjectType.laptop: [
        EvidenceItem("full_laptop", "Full laptop image", "The entire laptop visible in one frame."),
        EvidenceItem("damaged_area", "Damaged area image", "A close-up of the damaged component."),
        EvidenceItem("serial_number", "Serial number image", "A readable serial-number label."),
    ],
    ObjectType.package: [
        EvidenceItem("package", "Package image", "The full package and outer condition."),
        EvidenceItem("shipping_label", "Shipping label image", "A readable carrier label and tracking identifier."),
        EvidenceItem("damage", "Damage image", "A close-up of the package or item damage."),
    ],
}


def validate_evidence(object_type: ObjectType, submitted: list[str]) -> dict:
    required = REQUIREMENTS[object_type]
    supplied = set(submitted)
    missing = [item.label for item in required if item.key not in supplied]
    matched = len(required) - len(missing)
    score = round((matched / len(required)) * 100, 1)
    return {
        "score": score,
        "missing": missing,
        "required": [
            {"key": item.key, "label": item.label, "description": item.description}
            for item in required
        ],
        "submitted": list(supplied),
    }

