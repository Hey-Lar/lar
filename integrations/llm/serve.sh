#!/bin/bash
# Lar LLM — Ollama + qwen3:4b-instruct. Idempotent.
set -e
if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "starting ollama…"
  (ollama serve >/tmp/lar-llm.log 2>&1 &)
  for i in $(seq 1 20); do curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break; sleep 1; done
fi
ollama list | grep -q "qwen3:4b-instruct" || ollama pull qwen3:4b-instruct
echo "LLM up: qwen3:4b-instruct @ :11434"
