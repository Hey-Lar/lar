# Lar integrations

The local engines Lar talks to. Everything runs on the Mac; nothing leaves it.

| engine                                 | port  | serves                                                   | app path                 |
| -------------------------------------- | ----- | -------------------------------------------------------- | ------------------------ |
| **LLM** — Qwen3-4B-instruct via Ollama | 11434 | `/v1/chat/completions` (streamed NDJSON via `/api/chat`) | `apps/lar-ios` LarBridge |
| **Voice** — Kokoro-82M via mlx-audio   | 8000  | `/v1/audio/speech` (OpenAI-compatible, wav)              | LarBridge `speakNeural`  |

## One command

```bash
integrations/lar-up.sh
```

Starts both engines if they're down, waits until healthy, prints status.
The iOS app (simulator) reaches both at `127.0.0.1` — the sim shares the Mac's network.

## First-time setup

```bash
brew install ollama && ollama pull qwen3:4b-instruct
integrations/tts/install.sh          # venv at ~/.lar-tts with every dep pinned
```

## Hard-won notes

- Use `qwen3:4b-instruct`. The bare `qwen3:4b` tag is the 2507 _thinking_ build —
  it streams chain-of-thought as content and ignores `/no_think`.
- The TTS venv needs `misaki num2words spacy` installed SEPARATELY — the
  `misaki[en]` extra pins curated-tokenizers, which does not build on py3.14.
- `setuptools<81` (84 removed pkg_resources). spaCy's model downloader is broken
  here; install `en_core_web_sm` by wheel URL (install.sh does).
- espeak fallback comes from `espeakng-loader phonemizer-fork` — no brew espeak needed.
