from abc import ABC, abstractmethod


class Classifier(ABC):
    @abstractmethod
    def fit(self, X, y): ...

    @abstractmethod
    def predict(self, X): ...

    @abstractmethod
    def predict_proba(self, X): ...

    @abstractmethod
    def save(self, path: str): ...

    @classmethod
    @abstractmethod
    def load(cls, path: str) -> "Classifier": ...
