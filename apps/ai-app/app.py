import json
import os
import pathlib
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

MAX_TRANSCRIPT_CHARS = int(os.environ.get("MAX_TRANSCRIPT_CHARS", "12000"))

SUPPORTED_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".flac", ".ogg", ".mp4", ".mpeg", ".mpga", ".webm"
}

for folder in [AUDIO_INPUT_DIR, TRANSCRIPTS_DIR, OUTPUT_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

whisper = WhisperModel(
    WHISPER_MODEL,
    device="cpu",
    compute_type=WHISPER_COMPUTE_TYPE,
)

SCHEMA = {
    "type": "object",
    "properties": {
        "hiveId": {
            "type": ["string", "null"]
        },
        "date": {
            "type": ["string", "null"],
            "description": "ISO 8601 datetime string if the transcript clearly states the inspection date/time; otherwise null"
        },
        "temperature": {
            "type": ["number", "null"]
        },
        "weatherConditions": {
            "type": ["string", "null"]
        },
        "notes": {
            "type": ["string", "null"]
        },
        "observations": {
            "type": "object",
            "properties": {
                "strength": {"type": ["integer", "null"], "minimum": 0, "maximum": 10},
                "uncappedBrood": {"type": ["integer", "null"], "minimum": 0, "maximum": 10},
                "cappedBrood": {"type": ["integer", "null"], "minimum": 0, "maximum": 10},
                "honeyStores": {"type": ["integer", "null"], "minimum": 0, "maximum": 10},
                "pollenStores": {"type": ["integer", "null"], "minimum": 0, "maximum": 10},
                "queenCells": {"type": ["integer", "null"], "minimum": 0},
                "swarmCells": {"type": ["boolean", "null"]},
                "supersedureCells": {"type": ["boolean", "null"]},
                "queenSeen": {"type": ["boolean", "null"]},
                "broodPattern": {
                    "type": ["string", "null"],
                    "enum": ["solid", "spotty", "scattered", "patchy", "excellent", "poor", None]
                },
                "additionalObservations": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": [
                            "calm",
                            "defensive",
                            "aggressive",
                            "nervous",
                            "varroa_present",
                            "small_hive_beetle",
                            "wax_moths",
                            "ants_present",
                            "healthy",
                            "active",
                            "sluggish",
                            "thriving"
                        ]
                    }
                },
                "reminderObservations": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": [
                            "honey_bound",
                            "overcrowded",
                            "needs_super",
                            "queen_issues",
                            "requires_treatment",
                            "low_stores",
                            "prepare_for_winter"
                        ]
                    }
                }
            },
            "required": [
                "strength",
                "uncappedBrood",
                "cappedBrood",
                "honeyStores",
                "pollenStores",
                "queenCells",
                "swarmCells",
                "supersedureCells",
                "queenSeen",
                "broodPattern",
                "additionalObservations",
                "reminderObservations"
            ]
        },
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "FEEDING",
                            "TREATMENT",
                            "FRAME",
                            "MAINTENANCE",
                            "NOTE",
                            "OTHER"
                        ]
                    },
                    "notes": {
                        "type": ["string", "null"]
                    },
                    "details": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": [
                                    "FEEDING",
                                    "TREATMENT",
                                    "FRAME",
                                    "MAINTENANCE",
                                    "NOTE",
                                    "OTHER"
                                ]
                            },
                            "feedType": {"type": ["string", "null"]},
                            "amount": {"type": ["number", "null"]},
                            "unit": {"type": ["string", "null"]},
                            "concentration": {"type": ["string", "null"]},
                            "product": {"type": ["string", "null"]},
                            "quantity": {"type": ["number", "null"]},
                            "duration": {"type": ["string", "null"]},
                            "component": {
                                "type": ["string", "null"],
                                "enum": ["BOX", "BOTTOM_BOARD", "COVER", None]
                            },
                            "status": {
                                "type": ["string", "null"],
                                "enum": ["CLEANED", "REPLACED", None]
                            },
                            "content": {"type": ["string", "null"]}
                        },
                        "required": ["type"]
                    }
                },
                "required": ["type", "details"]
            }
        }
    },
    "required": [
        "hiveId",
        "date",
        "temperature",
        "weatherConditions",
        "notes",
        "observations",
        "actions"
    ]
}


def truncate_transcript(text: str, max_chars: int = MAX_TRANSCRIPT_CHARS) -> str:
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars]


def empty_recommendation() -> dict:
    return {
        "hiveId": None,
        "date": None,
        "temperature": None,
        "weatherConditions": None,
        "notes": None,
        "observations": {
            "strength": None,
            "uncappedBrood": None,
            "cappedBrood": None,
            "honeyStores": None,
            "pollenStores": None,
            "queenCells": None,
            "swarmCells": None,
            "supersedureCells": None,
            "queenSeen": None,
            "broodPattern": None,
            "additionalObservations": [],
            "reminderObservations": [],
        },
        "actions": [],
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

Return JSON that matches the provided schema exactly.

Hard rules:
- Be conservative.
- Do not invent facts.
- Only include information explicitly stated or clearly implied.
- Use the exact field names and enum values from the schema.
- Do not return extra keys.
- If a value is unknown, use null.
- If a list field is unknown, return [].
- If notes are unknown, return null.
- If no actions are mentioned, return [].
- If no observations are mentioned, keep the observations object but set its unknown values to null and arrays to [].

Field mapping rules:
- hiveId:
  - only fill this if the transcript explicitly contains a real HivePal hive UUID
  - otherwise null
- date:
  - only fill if a clear inspection date/time is spoken
  - return ISO-8601 string if known, otherwise null
- temperature:
  - numeric only
  - do not wrap inside a weather object
- weatherConditions:
  - short free-text weather description from transcript if stated, otherwise null
- notes:
  - concise free-text summary of notable inspection notes from transcript
  - keep it short and factual

Observations object:
- strength: hive/population strength rating 0-10 if clearly stated or strongly implied, else null
- uncappedBrood: 0-10 if stated/implied, else null
- cappedBrood: 0-10 if stated/implied, else null
- honeyStores: 0-10 if stated/implied, else null
- pollenStores: 0-10 if stated/implied, else null
- queenCells: integer count if stated; if explicitly none, use 0; if unknown, null
- swarmCells: true/false/null
- supersedureCells: true/false/null
- queenSeen: true/false/null
- broodPattern: must be exactly one of:
  solid, spotty, scattered, patchy, excellent, poor
- additionalObservations: only choose from:
  calm, defensive, aggressive, nervous, varroa_present, small_hive_beetle,
  wax_moths, ants_present, healthy, active, sluggish, thriving
- reminderObservations: only choose from:
  honey_bound, overcrowded, needs_super, queen_issues,
  requires_treatment, low_stores, prepare_for_winter

Actions:
Return only actions actually mentioned.
Each action must use this structure:
{{
  "type": "FEEDING" | "TREATMENT" | "FRAME" | "MAINTENANCE" | "NOTE" | "OTHER",
  "notes": "optional short note or null",
  "details": {{ ... }}
}}

Action details rules:
- FEEDING details:
  {{
    "type": "FEEDING",
    "feedType": string or null,
    "amount": number or null,
    "unit": string or null,
    "concentration": string or null
  }}
- TREATMENT details:
  {{
    "type": "TREATMENT",
    "product": string or null,
    "quantity": number or null,
    "unit": string or null,
    "duration": string or null
  }}
- FRAME details:
  {{
    "type": "FRAME",
    "quantity": integer or null
  }}
- MAINTENANCE details:
  {{
    "type": "MAINTENANCE",
    "component": "BOX" | "BOTTOM_BOARD" | "COVER" | null,
    "status": "CLEANED" | "REPLACED" | null
  }}
- NOTE details:
  {{
    "type": "NOTE",
    "content": string or null
  }}
- OTHER details:
  {{
    "type": "OTHER"
  }}

Normalization examples:
- "patch" -> "patchy"
- "varroa mites present" -> "varroa_present"
- "small hive beetle" -> "small_hive_beetle"
- "ants present" -> "ants_present"
- "needs a super" -> "needs_super"
- "queen issues" -> "queen_issues"
- "requires treatment" -> "requires_treatment"
- "low stores" -> "low_stores"
- "prepare for winter" -> "prepare_for_winter"

Transcript:
{transcript}
""".strip()


def normalize_recommendation(data: dict) -> dict:
    if not isinstance(data, dict):
        data = {}

    observations = data.get("observations") or {}
    actions = data.get("actions") or []

    brood_pattern_map = {
        "patch": "patchy",
        "patchy": "patchy",
        "solid": "solid",
        "spotty": "spotty",
        "scattered": "scattered",
        "excellent": "excellent",
        "poor": "poor",
        "": None,
        None: None,
    }

    additional_map = {
        "varroa mites present": "varroa_present",
        "varroa_present": "varroa_present",
        "small hive beetle": "small_hive_beetle",
        "small_hive_beetle": "small_hive_beetle",
        "wax moths": "wax_moths",
        "wax_moths": "wax_moths",
        "ants present": "ants_present",
        "ants_present": "ants_present",
        "calm": "calm",
        "defensive": "defensive",
        "aggressive": "aggressive",
        "nervous": "nervous",
        "healthy": "healthy",
        "active": "active",
        "sluggish": "sluggish",
        "thriving": "thriving",
    }

    reminder_map = {
        "honey bound": "honey_bound",
        "honey_bound": "honey_bound",
        "overcrowded": "overcrowded",
        "needs super": "needs_super",
        "needs_super": "needs_super",
        "queen issues": "queen_issues",
        "queen_issues": "queen_issues",
        "requires treatment": "requires_treatment",
        "requires_treatment": "requires_treatment",
        "low stores": "low_stores",
        "low_stores": "low_stores",
        "prepare for winter": "prepare_for_winter",
        "prepare_for_winter": "prepare_for_winter",
    }

    valid_additional = {
        "calm", "defensive", "aggressive", "nervous",
        "varroa_present", "small_hive_beetle", "wax_moths", "ants_present",
        "healthy", "active", "sluggish", "thriving"
    }

    valid_reminders = {
        "honey_bound", "overcrowded", "needs_super", "queen_issues",
        "requires_treatment", "low_stores", "prepare_for_winter"
    }

    normalized = empty_recommendation()

    normalized["hiveId"] = data.get("hiveId")
    normalized["date"] = data.get("date")
    normalized["temperature"] = data.get("temperature")
    normalized["weatherConditions"] = data.get("weatherConditions")
    normalized["notes"] = data.get("notes")

    normalized["observations"] = {
        "strength": observations.get("strength"),
        "uncappedBrood": observations.get("uncappedBrood"),
        "cappedBrood": observations.get("cappedBrood"),
        "honeyStores": observations.get("honeyStores"),
        "pollenStores": observations.get("pollenStores"),
        "queenCells": observations.get("queenCells"),
        "swarmCells": observations.get("swarmCells"),
        "supersedureCells": observations.get("supersedureCells"),
        "queenSeen": observations.get("queenSeen"),
        "broodPattern": brood_pattern_map.get(observations.get("broodPattern"), None),
        "additionalObservations": [
            additional_map[item]
            for item in observations.get("additionalObservations", [])
            if item in additional_map and additional_map[item] in valid_additional
        ],
        "reminderObservations": [
            reminder_map[item]
            for item in observations.get("reminderObservations", [])
            if item in reminder_map and reminder_map[item] in valid_reminders
        ],
    }

    normalized_actions = []

    for action in actions:
        if not isinstance(action, dict):
            continue

        action_type = action.get("type")
        details = action.get("details") or {}

        if action_type == "FEEDING":
            normalized_actions.append({
                "type": "FEEDING",
                "notes": action.get("notes"),
                "details": {
                    "type": "FEEDING",
                    "feedType": details.get("feedType"),
                    "amount": details.get("amount"),
                    "unit": details.get("unit"),
                    "concentration": details.get("concentration"),
                },
            })
        elif action_type == "TREATMENT":
            normalized_actions.append({
                "type": "TREATMENT",
                "notes": action.get("notes"),
                "details": {
                    "type": "TREATMENT",
                    "product": details.get("product"),
                    "quantity": details.get("quantity"),
                    "unit": details.get("unit"),
                    "duration": details.get("duration"),
                },
            })
        elif action_type == "FRAME":
            normalized_actions.append({
                "type": "FRAME",
                "notes": action.get("notes"),
                "details": {
                    "type": "FRAME",
                    "quantity": details.get("quantity"),
                },
            })
        elif action_type == "MAINTENANCE":
            normalized_actions.append({
                "type": "MAINTENANCE",
                "notes": action.get("notes"),
                "details": {
                    "type": "MAINTENANCE",
                    "component": details.get("component"),
                    "status": details.get("status"),
                },
            })
        elif action_type == "NOTE":
            normalized_actions.append({
                "type": "NOTE",
                "notes": action.get("notes"),
                "details": {
                    "type": "NOTE",
                    "content": details.get("content"),
                },
            })
        elif action_type == "OTHER":
            normalized_actions.append({
                "type": "OTHER",
                "notes": action.get("notes"),
                "details": {
                    "type": "OTHER",
                },
            })

    normalized["actions"] = normalized_actions
    return normalized


def recommend_from_transcript(transcript: str):
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Return only JSON that exactly matches the provided inspection schema."
            },
            {
                "role": "user",
                "content": build_prompt(transcript)
            }
        ],
        "stream": False,
        "format": SCHEMA
    }

    last_error = None

    for attempt in range(2):
        try:
            response = requests.post(OLLAMA_URL, json=payload, timeout=600)

            if not response.ok:
                app.logger.error(
                    "Ollama error %s: %s",
                    response.status_code,
                    response.text,
                )
                response.raise_for_status()

            data = response.json()
            content = data.get("message", {}).get("content", "{}")
            parsed = json.loads(content)
            return normalize_recommendation(parsed)

        except Exception as exc:
            last_error = exc
            app.logger.error("Ollama attempt %s failed: %s", attempt + 1, exc)
            if attempt == 0:
                time.sleep(2)

    raise last_error


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

    analysis_error = None
    try:
        trimmed_transcript = truncate_transcript(transcription["text"])
        recommendation = recommend_from_transcript(trimmed_transcript)
    except Exception as exc:
        analysis_error = str(exc)
        app.logger.exception("Recommendation generation failed")
        recommendation = empty_recommendation()

    files = save_outputs(base_name, transcription, recommendation)

    return {
        "audio_file": str(audio),
        "transcription": transcription,
        "recommendation": recommendation,
        "analysis_error": analysis_error,
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
            "analysisError": result["analysis_error"],
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
    trimmed_transcript = truncate_transcript(transcript)
    result = recommend_from_transcript(trimmed_transcript)
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
                    "analysisError": result["analysis_error"],
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