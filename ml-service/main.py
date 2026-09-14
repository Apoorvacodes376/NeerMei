from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from model_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.startup()
    yield


app = FastAPI(title="NeerMei ML Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ──────────────────────────────────────────────────────────────────

Mode = Literal["dummy", "sensor"]


class ModelRequest(BaseModel):
    mode: Mode = "dummy"
    sensorValues: dict = {}
    label: int | None = None


class BufferEntry(BaseModel):
    mode: Mode = "dummy"
    sensorValues: dict
    label: int  # 1 = purifiable/potable, 0 = not


class BufferBatch(BaseModel):
    mode: Mode = "dummy"
    entries: list[dict]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get(stage: str, mode: Mode):
    try:
        return manager.get(stage, mode)  # type: ignore[arg-type]
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown stage: {stage}")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/{stage}/train/start")
def train_start(stage: str, request: ModelRequest):
    state = _get(stage, request.mode)
    if state.is_training:
        return {"status": "already_training"}
    state.is_training = True
    state.buffer.clear()
    state.classifier = None
    state.trained_at = None
    state.accuracy = None
    state.progress = 0
    state.progress_stage = "waiting for data"
    state.training_error = None
    return {"status": "collecting", "stage": stage, "mode": request.mode, "progress": 0, "progress_stage": state.progress_stage}


@app.post("/{stage}/reset")
def reset(stage: str, request: ModelRequest):
    state = _get(stage, request.mode)
    state.reset()
    return {"status": "reset", "stage": stage, "mode": request.mode}


@app.post("/{stage}/train/stop")
def train_stop(stage: str, request: ModelRequest):
    state = _get(stage, request.mode)
    if not state.is_training:
        return {"status": "not_training"}
    if not state.start_retrain():
        return {"status": "training", "stage": stage, "mode": request.mode, "progress": state.progress, "progress_stage": state.progress_stage}
    return {"status": "training", "stage": stage, "mode": request.mode, "progress": state.progress, "progress_stage": state.progress_stage}


@app.post("/{stage}/buffer")
def add_to_buffer(stage: str, entry: BufferEntry):
    """Append a labelled reading to the training buffer while training is active."""
    state = _get(stage, entry.mode)
    if not state.is_training:
        raise HTTPException(status_code=400, detail="Not in training mode")
    state.add_to_buffer(entry.sensorValues, entry.label)
    return {"buffered": len(state.buffer)}


@app.post("/{stage}/buffer/batch")
def add_batch_to_buffer(stage: str, batch: BufferBatch):
    state = _get(stage, batch.mode)
    if not state.is_training:
        raise HTTPException(status_code=400, detail="Not in training mode")
    if not batch.entries:
        raise HTTPException(status_code=400, detail="Training batch is empty")
    for entry in batch.entries:
        if not isinstance(entry.get("sensorValues"), dict) or not isinstance(entry.get("label"), int):
            raise HTTPException(status_code=400, detail="Each training row needs sensorValues and an integer label")
        state.add_to_buffer(entry["sensorValues"], entry["label"])
    return {"buffered": len(state.buffer)}


@app.post("/{stage}/predict")
def predict(stage: str, request: ModelRequest):
    state = _get(stage, request.mode)
    try:
        result = state.predict(request.sensorValues)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return result


@app.get("/{stage}/status")
def status(stage: str, mode: Mode = "dummy"):
    state = _get(stage, mode)
    return {
        "stage": stage,
        "mode": mode,
        "status": "training" if state.is_training and state.progress_stage != "waiting for data" else ("collecting" if state.is_training else ("completed" if state.progress_stage == "training completed" else ("failed" if state.progress_stage == "training failed" else "idle"))),
        "progress": state.progress,
        "progress_stage": state.progress_stage,
        "training_error": state.training_error,
        "trained_at": state.trained_at,
        "accuracy": state.accuracy,
        "buffer_size": len(state.buffer),
        "feature_columns": getattr(state.classifier, "feature_columns", []),
        "excluded_columns": getattr(state.classifier, "excluded_columns", []),
        "test_values": getattr(state.classifier, "sample_values", {}),
    }
