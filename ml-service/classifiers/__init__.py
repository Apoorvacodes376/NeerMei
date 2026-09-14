import os
from .base import Classifier
from .random_forest import RandomForestClassifier


def build_classifier() -> Classifier:
    algo = os.getenv("ALGORITHM", "random_forest").lower()
    if algo == "random_forest":
        return RandomForestClassifier()
    raise ValueError(f"Unknown ALGORITHM: {algo}")
