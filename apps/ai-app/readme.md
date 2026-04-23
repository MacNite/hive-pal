# Prototype AI-Setup for Hivepal

This prototype setup can be used to automatically analyze audiorecordings, create a transcript of the recording and analyze the transcript to create a .json-File which can be used to create and inspection.

This prototype uses

- python with faster-whister for Speech-to-Text and transcribing
- Ollama for analyzing the transscript and creating the .json

Note: If you change app.py you have to restart the container.

Currently the folder-setup below is expected:

```js
/mnt/path/Hivepal/AI/
                    incoming/
                    processed/
                    transcripts/
                    prompts/
                    ollama/
```

Below is the docker file I use for the AI Container. I just added it to the docker stack for hivepal so everything runs together. I recently switched the model from qwen3:8b to qwen2.5:3b as I currently only use CPU-computing. The code in general is model-agnostic - you can set your desired model using the OLLAMA_MODEL enviroment variable. The image runs as user appuser (ID:999). This user needs r+w permissions to the path  mounted for data.

Whisper is currently set to auto-detect the language.

```js
services:
  ollama:
    image: ollama/ollama:latest
    container_name: hivepal-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - /mnt/path/Apps/HivePal/AI/ollama:/root/.ollama

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
  - OLLAMA_MODEL=qwen2.5:3b
  - WHISPER_MODEL=small
  - WHISPER_COMPUTE_TYPE=int8
  - AUDIO_INPUT_DIR=/data/incoming
  - TRANSCRIPTS_DIR=/data/transcripts
  - OUTPUT_DIR=/data/processed
  - AI_API_KEY=change-me-long-random-string
    volumes:
      - /mnt/path/Apps/HivePal/AI:/data
      - /mnt/path/Apps/HivePal/AI/app:/app
    depends_on:
      - ollama
```

You need to add the ENV-Variables bleow to the hivepal container. Additionally you need some kind of storage. I prefer local, but S3 works as well.

```js
  AI_ENABLED: "true"
  AI_SERVICE_BASE_URL: "http://YOUR-AI-HOST:8008"
  AI_API_KEY: "change-me-long-random-string"
  AI_REQUEST_TIMEOUT_MS: "300000"
  BACKEND_PUBLIC_URL: https://mydomain.tld OR ip
  FRONTEND_URL: http://mydomain.tld OR ip
  STORAGE_TYPE: local
```

After running the container for the first time you have to download the model. The model has a size of about 6 GB so the download may take some time.

```js
curl http://serverip:11434/api/pull -d '{
  "model": "qwen2.5:3b",
  "stream": false
}'
```

Or just run the code below inside the container

```js
  ollama pull <Model-Name>
```

Use the command below to see if  everything is running correctly:

```js
curl http://serverip:8008/health
```

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

