# Prototype AI-Setup for Hivepal

This prototype setup can be used to automatically analyze audiorecordings, create a transcript of the recording and analyze the transcript to create a .json-File which can be used to create and inspection.

This prototype uses

- python with faster-whister for Speech-to-Text and transcribing
- Ollama for analyzing the transscript and creating the .json

Note: If you change app.py you have to restart the container.

Currently the folder-setup below is expected:

```js
/mnt/path/Hivepal/ai/
                    incoming/
                    processed/
                    transcripts/
                    prompts/
                    ollama/
```

Below is the docker yaml-File I use. Currently it runs in a completely seperate container as a "prove of concept". As i do not have a GPU in my server installed i use the OLLAMA_MODEL qwen3:8b. Whisper is currently set to auto-detect the language.

```js
services:
  ollama:
    image: ollama/ollama:latest
    container_name: hivepal-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - /mnt/path/HivePal/AI/ollama:/root/.ollama

  hivepal-ai:
    image: python:3.11-slim
    container_name: hivepal-ai
    restart: unless-stopped
    working_dir: /app
    command: >
  		bash -lc "
  		apt-get update &&
  		apt-get install -y ffmpeg &&
  		pip install --no-cache-dir flask requests faster-whisper watchdog &&
  		python app.py
  		"
    ports:
      - "8008:8008"
    environment:
      - OLLAMA_URL=http://ollama:11434/api/chat
      - OLLAMA_MODEL=qwen3:8b
      - WHISPER_MODEL=small
      - WHISPER_COMPUTE_TYPE=int8
      - AUDIO_INPUT_DIR=/data/incoming
      - TRANSCRIPTS_DIR=/data/transcripts
      - OUTPUT_DIR=/data/processed
    volumes:
      - /mnt/path/HivePal/AI:/data
      - /mnt/path/HivePal/AI/app:/app
    depends_on:
      - ollama
```

After running the container for the first time you have to download the model. The model has a size of about 6 GB so the download may take some time.

```js
curl http://serverip:11434/api/pull -d '{
  "model": "qwen3:8b",
  "stream": false
}'
```
Use the command below to see if  everything is running correctly:
curl http://serverip:8008/health
```js

After that you can put audio-files into the folder "incoming". You can start analyzing with

```js
curl -X POST http://serverip:8008/process \
  -H "Content-Type: application/json" \
  -d '{
    "audio_path": "/data/incoming/test-datei1.webm"
  }'
```
You can process all audio files in the "incoming" folder with

```js
curl -X POST http://serverip:8008/process_incoming
```

