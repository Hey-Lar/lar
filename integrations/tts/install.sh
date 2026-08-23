#!/bin/bash
# Lar voice — mlx-audio + Kokoro venv at ~/.lar-tts. Run once.
set -e
python3 -m venv "$HOME/.lar-tts"
P="$HOME/.lar-tts/bin/pip"
"$P" install -q "setuptools<81"
"$P" install -q mlx-audio uvicorn fastapi webrtcvad python-multipart
"$P" install -q misaki num2words spacy espeakng-loader phonemizer-fork
"$P" install -q "https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
echo "TTS venv ready. First synthesis downloads Kokoro-82M (~330MB)."

# ── the two patches the ecosystem needs on py3.14 ──
SP=$(ls -d "$HOME/.lar-tts/lib/python3"*/site-packages)
# misaki hardcodes a brew espeak path; point it at the pip-bundled espeak-ng
python3 - "$SP/misaki/espeak.py" <<'PYEOF'
import sys
p = sys.argv[1]; s = open(p).read()
if 'Lar patch' not in s:
    old = "    if not EspeakWrapper._ESPEAK_LIBRARY:\n        import os\n        import platform"
    new = ("    if not EspeakWrapper._ESPEAK_LIBRARY:\n"
           "        try:  # Lar patch: prefer the pip-bundled espeak-ng over brew paths\n"
           "            import espeakng_loader\n"
           "            EspeakWrapper.set_library(espeakng_loader.get_library_path())\n"
           "            try: EspeakWrapper.set_data_path(espeakng_loader.get_data_path())\n"
           "            except Exception: pass\n"
           "            return EspeakWrapper._ESPEAK_LIBRARY\n"
           "        except Exception:\n"
           "            pass\n"
           "        import os\n        import platform")
    assert old in s, "misaki espeak anchor moved"
    s = s.replace(old, new, 1); open(p, 'w').write(s)
    print("misaki patched")
else:
    print("misaki already patched")
PYEOF
echo "install complete — start with tts/serve.sh"
