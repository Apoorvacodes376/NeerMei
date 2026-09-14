import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier as _RFC
from .base import Classifier


class RandomForestClassifier(Classifier):
    def __init__(self, n_estimators: int = 100, random_state: int = 42):
        self._model = _RFC(n_estimators=n_estimators, random_state=random_state, class_weight='balanced')
        self.feature_columns = []
        self.excluded_columns = []
        self.sample_values = {}
        self.feature_selection_version = 1
        self.preprocessing = {}

    def fit(self, X, y):
        self._model.fit(X, y)

    def predict(self, X):
        return self._model.predict(X).tolist()

    def predict_proba(self, X):
        return self._model.predict_proba(X).tolist()

    def save(self, path: str):
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str) -> "RandomForestClassifier":
        loaded = joblib.load(path)
        if isinstance(loaded, cls):
            return loaded
        instance = cls.__new__(cls)
        instance._model = loaded
        instance.feature_columns = []
        instance.excluded_columns = []
        instance.sample_values = {}
        instance.feature_selection_version = getattr(loaded, "feature_selection_version", 0)
        instance.preprocessing = getattr(loaded, "preprocessing", {})
        return instance
