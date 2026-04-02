import json
import os
import pathlib
import threading
import time
import tempfile
from flask import Flask, jsonify, request
from faster_whisper import WhisperModel
import requests

app = Flask(__name__)
AI_API_KEY = os.environ.get("AI_API_KEY", "")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434/api/chat")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:8b")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

AUDIO_INPUT_DIR = pathlib.Path(os.environ.get("AUDIO_INPUT_DIR", "/data/incoming"))
TRANSCRIPTS_DIR = pathlib.Path(os.environ.get("TRANSCRIPTS_DIR", "/data/transcripts"))
OUTPUT_DIR = pathlib.Path(os.environ.get("OUTPUT_DIR", "/data/processed"))

SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".mp4", ".mpeg", ".mpga", ".webm"}

for folder in [AUDIO_INPUT_DIR, TRANSCRIPTS_DIR, OUTPUT_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

# Load model once on startup
whisper = WhisperModel(
    WHISPER_MODEL,
    device="cpu",
    compute_type=WHISPER_COMPUTE_TYPE,
)

SCHEMA = {
    "type": "object",
    "properties": {
        "hive_name": {"type": "string"},
        "weather": {
            "type": "object",
            "properties": {
                "temperature_c": {"type": ["number", "null"]},
                "condition": {"type": "string"}
            },
            "required": ["temperature_c", "condition"]
        },
        "queen_seen": {"type": ["boolean", "null"]},
        "hive_strength": {
            "type": "object",
            "properties": {
                "condition": {
                    "type": ["string", "null"],
                    "enum": ["good", "bad", None]
                },
                "rating": {"type": ["integer", "null"], "minimum": 1, "maximum": 10}
            },
            "required": ["condition", "rating"]
        },
        "capped_brood": {
            "type": "object",
            "properties": {
                "present": {"type": ["boolean", "null"]},
                "rating": {"type": ["integer", "null"], "minimum": 1, "maximum": 10}
            },
            "required": ["present", "rating"]
        },
        "uncapped_brood": {
            "type": "object",
            "properties": {
                "present": {"type": ["boolean", "null"]},
                "rating": {"type": ["integer", "null"], "minimum": 1, "maximum": 10}
            },
            "required": ["present", "rating"]
        },
        "brood_pattern": {
            "type": "string",
            "enum": ["solid", "spotty", "scattered", "patch", "excellent", "poor", ""]
        },
        "honey_stores": {
            "type": "object",
            "properties": {
                "present": {"type": ["boolean", "null"]},
                "rating": {"type": ["integer", "null"], "minimum": 1, "maximum": 10}
            },
            "required": ["present", "rating"]
        },
        "pollen_stores": {
            "type": "object",
            "properties": {
                "present": {"type": ["boolean", "null"]},
                "rating": {"type": ["integer", "null"], "minimum": 1, "maximum": 10}
            },
            "required": ["present", "rating"]
        },
        "queen_cells": {
            "type": "object",
            "properties": {
                "present": {"type": ["boolean", "null"]},
                "rating": {"type": ["integer", "null"], "minimum": 1, "maximum": 10}
            },
            "required": ["present", "rating"]
        },
        "additional_observations": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    "calm",
                    "defensive",
                    "aggressive",
                    "nervous",
                    "varroa mites present",
                    "small hive beetle",
                    "wax moths",
                    "ants present",
                    "healthy",
                    "active",
                    "sluggish",
                    "thriving"
                ]
            }
        },
        "reminders": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    "honey bound",
                    "overcrowded",
                    "needs super",
                    "queen issues",
                    "requires treatment",
                    "low stores",
                    "prepare for winter"
                ]
            }
        },
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["feeding", "treatment", "frames", "note"]
                    },
                    "details": {"type": "string"}
                },
                "required": ["type", "details"]
            }
        }
    },
    "required": [
        "hive_name",
        "weather",
        "queen_seen",
        "hive_strength",
        "capped_brood",
        "uncapped_brood",
        "brood_pattern",
        "honey_stores",
        "pollen_stores",
        "queen_cells",
        "additional_observations",
        "reminders",
        "actions"
    ]
}

def require_api_key(req):
    if not AI_API_KEY:
        return
    auth = req.headers.get("Authorization", "")
    expected = f"Bearer {AI_API_KEY}"
    if auth != expected:
        from flask import abort
        abort(401, description="Unauthorized")

def transcribe_file(audio_path: str):
    segments, info = whisper.transcribe(
        audio_path,
        vad_filter=True,
        beam_size=5,
    )

    segment_list = []
    full_text_parts = []

    for seg in segments:
        text = seg.text.strip()
        segment_list.append({
            "start": seg.start,
            "end": seg.end,
            "text": text
        })
        if text:
            full_text_parts.append(text)

    return {
        "language": getattr(info, "language", None),
        "language_probability": getattr(info, "language_probability", None),
        "duration": getattr(info, "duration", None),
        "text": " ".join(full_text_parts).strip(),
        "segments": segment_list,
    }


def build_prompt(transcript: str):
    return f"""
You extract structured hive inspection data from a beekeeper's spoken transcript.

Rules:
- Be conservative.
- Do not invent facts.
- Only use information explicitly stated or clearly implied in the transcript.
- If a field is unknown, return:
  - empty string "" for plain text enum fields
  - null for temperature_c
  - null for queen_seen
  - null for unknown boolean-like fields
  - null for unknown ratings
  - empty list [] for list fields
- Normalize wording to the allowed schema values exactly.
- Do not add observations, reminders, or actions unless supported by the transcript.

Field guidance:
- hive_name: hive identifier or name.
- weather.temperature_c: numeric Celsius only if stated.
- weather.condition: short description like "sunny", "cloudy", "windy", otherwise "".
- queen_seen: true, false, or null if not mentioned.

- hive_strength.condition:
  - "good" if the hive strength is described positively
  - "bad" if described negatively
  - null if unclear
- hive_strength.rating:
  - integer from 1 to 10 only if the transcript supports a reasonable estimate
  - otherwise null

- capped_brood.present, uncapped_brood.present, honey_stores.present, pollen_stores.present, queen_cells.present:
  - true if clearly present
  - false if clearly absent
  - null if not mentioned

- capped_brood.rating, uncapped_brood.rating, honey_stores.rating, pollen_stores.rating, queen_cells.rating:
  - integer from 1 to 10 only if the transcript supports a reasonable estimate
  - otherwise null

- brood_pattern must be one of:
  "solid", "spotty", "scattered", "patch", "excellent", "poor"
  or "" if unknown.

- additional_observations: choose only from the allowed list.
- reminders: choose only from the allowed list.
- actions: create structured action objects with type and short details.

Transcript:
{transcript}
""".strip()


def recommend_from_transcript(transcript: str):
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Return only structured business documentation data extracted from the transcript."
            },
            {
                "role": "user",
                "content": build_prompt(transcript)
            }
        ],
        "stream": False,
        "format": SCHEMA
    }

    response = requests.post(OLLAMA_URL, json=payload, timeout=600)

    if not response.ok:
        app.logger.error("Ollama error %s: %s", response.status_code, response.text)
        response.raise_for_status()

    data = response.json()

    content = data.get("message", {}).get("content", "{}")
    return json.loads(content)


def save_outputs(base_name: str, transcription: dict, recommendation: dict):
    transcript_path = TRANSCRIPTS_DIR / f"{base_name}.txt"
    transcript_json_path = TRANSCRIPTS_DIR / f"{base_name}.transcript.json"
    result_json_path = OUTPUT_DIR / f"{base_name}.recommendation.json"

    transcript_path.write_text(transcription["text"], encoding="utf-8")
    transcript_json_path.write_text(
        json.dumps(transcription, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    result_json_path.write_text(
        json.dumps(recommendation, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return {
        "transcript_txt": str(transcript_path),
        "transcript_json": str(transcript_json_path),
        "recommendation_json": str(result_json_path),
    }


def process_audio_file(audio_path: str):
    audio = pathlib.Path(audio_path)
    base_name = audio.stem

    transcription = transcribe_file(str(audio))
    recommendation = recommend_from_transcript(transcription["text"])
    files = save_outputs(base_name, transcription, recommendation)

    return {
        "audio_file": str(audio),
        "transcription": transcription,
        "recommendation": recommendation,
        "files": files,
    }

@app.post("/process-upload")
def process_upload():
    require_api_key(request)

    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    uploaded = request.files["file"]
    if not uploaded.filename:
        return jsonify({"error": "empty filename"}), 400

    suffix = pathlib.Path(uploaded.filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        return jsonify({"error": f"unsupported file type: {suffix}"}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        uploaded.save(tmp.name)
        temp_path = tmp.name

    try:
        result = process_audio_file(temp_path)
        return jsonify({
            "status": "completed",
            "transcript": result["transcription"],
            "inspectionDraft": result["recommendation"],
            "files": result["files"],
        })
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "ollama_url": OLLAMA_URL,
        "ollama_model": OLLAMA_MODEL,
        "whisper_model": WHISPER_MODEL,
        "input_dir": str(AUDIO_INPUT_DIR),
    })


@app.post("/transcribe")
def transcribe_endpoint():
    data = request.get_json(force=True)
    audio_path = data["audio_path"]
    result = transcribe_file(audio_path)
    return jsonify(result)


@app.post("/recommend")
def recommend_endpoint():
    data = request.get_json(force=True)
    transcript = data["transcript"]
    result = recommend_from_transcript(transcript)
    return jsonify(result)


@app.post("/process")
def process_endpoint():
    data = request.get_json(force=True)
    audio_path = data["audio_path"]
    result = process_audio_file(audio_path)
    return jsonify(result)


@app.post("/process_incoming")
def process_incoming():
    processed = []

    for item in sorted(AUDIO_INPUT_DIR.iterdir()):
        if item.is_file() and item.suffix.lower() in SUPPORTED_EXTENSIONS:
            try:
                result = process_audio_file(str(item))
                processed.append({
                    "file": item.name,
                    "status": "ok",
                    "output": result["files"],
                })
            except Exception as exc:
                processed.append({
                    "file": item.name,
                    "status": "error",
                    "error": str(exc),
                })

    return jsonify({"results": processed})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8008)