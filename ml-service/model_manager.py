"""
ModelManager: per-stage, per-mode model lifecycle.
Each stage/mode pair has its own classifier, training buffer, and artifact.
"""
import os
import csv
import math
import re
import threading
from datetime import datetime, timezone
from typing import Literal, Optional
import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from classifiers import build_classifier, Classifier
from data.bootstrap import generate as generate_bootstrap

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

Stage = Literal["pre", "post"]
Mode = Literal["dummy", "sensor"]


def _artifact_path(stage: Stage, mode: Mode) -> str:
    return os.path.join(ARTIFACTS_DIR, f"{stage}_{mode}_model.joblib")


def _load_csv(path: str):
    with open(path) as f:
        rows = list(csv.DictReader(f))
    return _prepare_rows(rows, "label")


def _is_metadata_column(column: str) -> bool:
    tokens = re.findall(r"[a-z0-9]+", column.lower())
    metadata_tokens = {"id", "uuid", "key", "index", "timestamp", "date", "time"}
    return bool(metadata_tokens.intersection(tokens))


def _prepare_rows(rows: list[dict], target_column: str):
    if not rows or target_column not in rows[0]:
        raise ValueError(f"Training data must include target column '{target_column}'")

    candidate_columns = [column for column in rows[0] if column != target_column]
    feature_columns = []
    excluded_columns = []
    for column in candidate_columns:
        if _is_metadata_column(column):
            excluded_columns.append(column)
            continue
        try:
            values = [float(row[column]) for row in rows]
        except (KeyError, TypeError, ValueError):
            excluded_columns.append(column)
            continue
        if not all(math.isfinite(value) for value in values) or len(set(values)) <= 1:
            excluded_columns.append(column)
            continue
        feature_columns.append(column)

    if not feature_columns:
        raise ValueError("No usable numeric feature columns were found")

    try:
        X = np.array([[float(row[column]) for column in feature_columns] for row in rows])
        y = np.array([int(row[target_column]) for row in rows])
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("Training data contains invalid feature or target values") from error
    return X, y, feature_columns, excluded_columns


class StageState:
    def __init__(self, stage: Stage, mode: Mode):
        self.stage = stage
        self.mode = mode
        self.classifier: Optional[Classifier] = None
        self.is_training = False
        self.trained_at: Optional[str] = None
        self.accuracy: Optional[float] = None
        self.buffer: list[dict] = []
        self.progress = 0
        self.progress_stage = "idle"
        self.training_error: Optional[str] = None
        self.excluded_columns: list[str] = []
        self.sample_values: dict = {}
        self._lock = threading.Lock()

    def bootstrap(self):
        """Train on default dataset so predictions work immediately."""
        path = generate_bootstrap()
        X, y, feature_columns, excluded_columns = _load_csv(path)
        clf = build_classifier()
        clf.fit(X, y)
        clf.feature_columns = feature_columns
        clf.excluded_columns = excluded_columns
        clf.sample_values = {column: float(X[0][index]) for index, column in enumerate(feature_columns)}
        clf.preprocessing = {"feature_columns": feature_columns, "excluded_columns": excluded_columns, "numeric": True}
        artifact = _artifact_path(self.stage, self.mode)
        clf.save(artifact)
        self.classifier = clf
        self.trained_at = datetime.now(timezone.utc).isoformat()
        # Quick accuracy estimate on full bootstrap set (no held-out split needed for bootstrap)
        preds = clf.predict(X)
        self.accuracy = round(accuracy_score(y, preds), 4)

    def load_or_bootstrap(self):
        artifact = _artifact_path(self.stage, self.mode)
        if os.path.exists(artifact):
            try:
                from classifiers.random_forest import RandomForestClassifier
                self.classifier = RandomForestClassifier.load(artifact)
                if getattr(self.classifier, "feature_selection_version", 0) != 1:
                    raise ValueError("Legacy artifact requires retraining")
                self.trained_at = datetime.fromtimestamp(
                    os.path.getmtime(artifact), tz=timezone.utc
                ).isoformat()
                self.accuracy = None  # unknown without re-eval
                return
            except Exception:
                pass
        if self.mode == "dummy":
            self.bootstrap()

    def add_to_buffer(self, sensor_values: dict, label: int):
        with self._lock:
            self.buffer.append({**sensor_values, "label": label})

    def reset(self):
        with self._lock:
            self.buffer.clear()
        self.classifier = None
        self.is_training = False
        self.trained_at = None
        self.accuracy = None
        self.excluded_columns = []
        self.sample_values = {}
        self.progress = 0
        self.progress_stage = "idle"
        self.training_error = None
        artifact = _artifact_path(self.stage, self.mode)
        if os.path.exists(artifact):
            os.remove(artifact)

    def retrain(self) -> float:
        self.progress_stage = "loading data"
        self.progress = 10
        with self._lock:
            buf = list(self.buffer)

        if not buf:
            raise ValueError("No labelled readings in this model's training buffer")

        self.progress_stage = "validating data"
        self.progress = 25
        X, y, feature_columns, excluded_columns = _prepare_rows(buf, "label")

        self.progress_stage = "preprocessing"
        self.progress = 40
        clf = build_classifier()
        clf.feature_columns = feature_columns
        clf.excluded_columns = excluded_columns
        clf.sample_values = {column: float(X[0][index]) for index, column in enumerate(feature_columns)}
        clf.preprocessing = {"feature_columns": feature_columns, "excluded_columns": excluded_columns, "numeric": True}
        self.progress_stage = "training model"
        self.progress = 60
        if len(set(y)) > 1 and len(X) >= 4:
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
            clf.fit(X_tr, y_tr)
            acc = round(accuracy_score(y_te, clf.predict(X_te)), 4)
        else:
            clf.fit(X, y)
            acc = round(accuracy_score(y, clf.predict(X)), 4)

        self.progress_stage = "evaluating model"
        self.progress = 80
        artifact = _artifact_path(self.stage, self.mode)
        self.progress_stage = "saving model"
        self.progress = 90
        clf.save(artifact)
        self.classifier = clf
        self.trained_at = datetime.now(timezone.utc).isoformat()
        self.accuracy = acc
        self.excluded_columns = excluded_columns
        self.sample_values = clf.sample_values
        self.progress_stage = "training completed"
        self.progress = 100
        return acc

    def start_retrain(self):
        if self.progress_stage not in ("idle", "waiting for data", "training completed", "training failed"):
            return False
        self.is_training = True
        self.training_error = None

        def run():
            try:
                self.retrain()
            except Exception as error:
                self.training_error = str(error)
                self.progress_stage = "training failed"
                self.progress = 0
            finally:
                self.is_training = False

        threading.Thread(target=run, daemon=True).start()
        return True

    def predict(self, sensor_values: dict) -> dict:
        if self.classifier is None:
            raise RuntimeError("Model not trained")
        feature_columns = getattr(self.classifier, "feature_columns", [])
        if not feature_columns:
            raise RuntimeError("Model feature columns are unavailable; retrain this model")
        missing = [column for column in feature_columns if column not in sensor_values]
        if missing:
            raise RuntimeError(f"Missing required model features: {', '.join(missing)}")
        try:
            values = [float(sensor_values[column]) for column in feature_columns]
        except (TypeError, ValueError) as error:
            raise RuntimeError("Prediction features must be numeric") from error
        if not all(math.isfinite(value) for value in values):
            raise RuntimeError("Prediction features must be finite numeric values")
        X = np.array([values])
        pred = self.classifier.predict(X)[0]
        proba = self.classifier.predict_proba(X)[0]
        confidence = round(max(proba), 4)
        return {"prediction": int(pred), "confidence": confidence, "mode": self.mode, "features": feature_columns}


class ModelManager:
    def __init__(self):
        self._states: dict[tuple[Stage, Mode], StageState] = {
            (stage, mode): StageState(stage, mode)
            for stage in ("pre", "post")
            for mode in ("dummy", "sensor")
        }

    def startup(self):
        for state in self._states.values():
            state.load_or_bootstrap()

    def get(self, stage: Stage, mode: Mode) -> StageState:
        try:
            return self._states[(stage, mode)]
        except KeyError:
            raise ValueError(f"Unknown stage/mode: {stage}/{mode}")


manager = ModelManager()
