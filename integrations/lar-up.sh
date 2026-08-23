#!/bin/bash
# Bring the whole Lar stack up: LLM + voice. Safe to run any time.
cd "$(dirname "$0")"
./llm/serve.sh
./tts/serve.sh
echo
echo "Lar stack:"
curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && echo "  LLM   ✓ :11434" || echo "  LLM   ✗"
curl -sf http://127.0.0.1:8000/ >/dev/null 2>&1 && echo "  Voice ✓ :8000" || echo "  Voice ✗"
