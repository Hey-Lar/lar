#!/bin/bash
# Lar voice server — Kokoro via mlx-audio, OpenAI-compatible /v1/audio/speech.
set -e
if curl -sf http://127.0.0.1:8000/ >/dev/null 2>&1; then echo "TTS already up @ :8000"; exit 0; fi
("$HOME/.lar-tts/bin/python" -m mlx_audio.server --port 8000 >/tmp/lar-tts.log 2>&1 &)
for i in $(seq 1 30); do curl -sf http://127.0.0.1:8000/ >/dev/null 2>&1 && break; sleep 1; done
echo "TTS up: Kokoro-82M (bf_emma) @ :8000"
