# 22 · Recon learnings — curated-repo study

> Provenance: a multi-agent study of a curated set of starred GitHub repositories
> (awesome-APIs, OSS-alternatives, awesome-quant, the AI-agent / subagent / skill
> collections, the design-tool + React lists, and three security/hardening
> indexes), each mapped concretely onto Lar's modules and principles
> (neutral · privacy-first · local-first + E2EE · routes outward · tablet-first).
> This is a durable brief, not a backlog — pull items into the roadmap as they fit.

The design half of the same recon drove the premium UI pass already shipped
(directional scene, re-lit liquid glass, token ladders, tiered hierarchy). This
doc captures the **strategy** half.

---

## 1 · Highest-leverage opportunities

| Opportunity                                                                                                                                                                                                                                                                                           | Effort    | Maps to             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------- |
| **Open-Meteo as the keyless weather spine** — forecast + geocoding + air-quality on one EU-hosted, keyless platform; MET Norway + NWS as keyless fallbacks. The Air-Quality endpoint also feeds a keyless outdoor-air tile to **Health** with zero new vendor.                                        | quick-win | weather, health     |
| **OSM places engine** — Nominatim (resolve) + Overpass (live POI by category) + Photon/Pelias (autocomplete) + Wikidata (enrichment). Community-owned, no per-call billing, no Google tracking — the canonical "route outward, own nothing proprietary" embodiment.                                   | medium    | places              |
| **MusicBrainz + Cover Art Archive + ListenBrainz** — open catalog (stable MBIDs) + keyless artwork + open scrobbling. The unlock: Lar can **own the user's listening history** outside any walled garden, then still hand playback to their chosen app — a concrete "you own the algorithm" artifact. | medium    | music               |
| **Open-feed news + GDELT** — direct publisher RSS/Atom (user picks sources) + GDELT 2.0 (keyless, 15-min global monitoring) + Wikipedia "In the news". Turns the news link-list into a real reader where the **user, not an ad-driven algorithm, owns source selection and ranking**.                 | medium    | news                |
| **Local-first wealth analytics** — a pure-compute metrics engine (CAGR, max-drawdown, vol, Sharpe/Sortino, VaR, allocation) over keyless price/FX feeds (CoinGecko-keyless, Frankfurter FX, FRED). All holdings stay on-device.                                                                       | medium    | wealth              |
| **Open Library + Gutendex + Standard Ebooks** — neutral Goodreads replacement + 76k+ free public-domain ebooks. Lar can hand the user a real, DRM-free book, then still deep-link to buy/borrow in-copyright titles.                                                                                  | quick-win | books               |
| **Film/TV availability router** — TVmaze (keyless) + TMDb watch-providers (JustWatch data, 120+ countries) → show "where can I watch X" → deep-link to the service the user already subscribes to. Pure no-lock-in routing.                                                                           | medium    | film & tv           |
| **Offline-first translate** — Argos/LibreTranslate on-device so simple translations never touch the cloud; the cleanest example of the local tier doing real work with zero data egress.                                                                                                              | medium    | translate           |
| **Podcasts as pure open RSS** — keyless iTunes lookup → own the feed URL → play the open enclosure directly; gPodder.net for cross-device sync without a proprietary account.                                                                                                                         | quick-win | podcasts            |
| **Step-up auth + idle re-lock on the wall display** — re-auth (passkey/PIN/biometric) before money/health/private-memory; auto-lock/blur after idle; keep the ambient clock/weather/agenda glanceable. Converts an always-on-screen privacy liability into a trust feature.                           | medium    | platform / security |

---

## 2 · Connector ideas (keyless / open-first)

**Design rule:** every connector ships a keyless adapter as the default
destination; any keyed source (TMDb, Podcast Index, Alpha Vantage/Tiingo/Finnhub)
is opt-in "bring your own key" behind a single managed **server-side** key — never
in the client bundle.

- **Air-quality bridge** — reuse the weather connector's Open-Meteo client to expose a keyless Air-Quality adapter (PM2.5/PM10/pollen/UV) for Health.
- **FX normalization** — a Frankfurter (ECB, keyless) adapter converts multi-currency holdings to one display currency from public rates, so net-worth math needs no position data on the wire.
- **Position-privacy fetch** — batch-fetch a superset of tickers (or per-asset without quantities) so network traffic never reveals actual holdings. Implement once, reuse across finance adapters.
- **Open-RSS reader core** — one keyless feed-ingest/enclosure-fetch utility shared by news and podcasts (both are "own the feed URL" models); discovery via OpenRSS for sites lacking native feeds.
- **Wikidata/Wikipedia enrichment** — one keyless adapter layering descriptions/images/cross-IDs onto places, books, music, and film&TV cards — avoids a commercial metadata provider in four modules at once.
- **ListenBrainz "owned history"** — keyless reads for recommendations + user-token listen-submit → a portable listening history outside any silo.
- **OpenBB pluggable source** — a swappable finance data plane (keyless default, BYO-key power tier), strictly read-only (no trading / private-account endpoints).

OSS-alternative routing targets worth knowing: Google Maps/Places → OSM · Last.fm
→ ListenBrainz · Feedly/Google News → FreshRSS/RSS · Goodreads → Open Library ·
Kindle (public-domain) → Gutenberg/Standard Ebooks · Bloomberg → OpenBB · Google
Translate/DeepL → LibreTranslate · YouTube → Invidious/Piped · X → Nitter
(treat the privacy-frontends as user-configurable optional destinations given
their uptime/legal volatility, not defaults).

---

## 3 · Tiered-AI architecture (the brain Lar hasn't built yet)

No ASR/intent/router/skill code exists in the repo yet — the connectors and the
E2EE store are built; the brain is not. Build it as a **new layer** with a
classification-first, confidence-gated waterfall:

```
on-device ASR → text
  → (1) DETERMINISTIC intent layer FIRST
        regex/grammar for fixed commands (timers, lights, volume, "play X")
        + embedding-similarity against a registered skill catalog
        → most home commands never touch an LLM, resolve even offline
  → (2) if ambiguous: small LOCAL LLM as the router
        emits validated JSON {skill,args,confidence} via constrained decoding
        reject-and-clarify on parse failure (never guess)
  → (3) the matched SKILL owns its tools + focused prompt + allowed model tier,
        in an ISOLATED context (a media query can't read money/health/memory)
```

**Escalation cascade:** deterministic → local small LLM → metered cloud LLM.
Escalate to cloud only when local confidence < threshold, the classifier tags the
request complex (multi-step planning, open-ended Q&A, cross-module reasoning), or a
skill declares `model: cloud`. Target **70–80 % served locally**; a sustained

> 20–25 % cloud rate signals a mis-tuned threshold. Treat the cloud token budget as
> a **hard per-user/period product constraint**: meter calls, show remaining budget,
> prompt-cache stable system prompts, degrade to local-only when exhausted.

**A "skill"** = a declaratively-manifested capability with frontmatter
`{ name, description (the trigger text for intent matching), tools (least-privilege:
money/health get read-only connectors; home/agenda get scoped write tools), model
(local-small | local-reasoning | cloud), scope }`. Progressive disclosure: index the
short description for routing; load the full prompt+tools only when selected.

**Model menu by tier:** local-small router/intent = Llama-3.2-1B / Qwen2.5-1.5B;
local mid (≥6 GB RAM) = Llama-3.2-3B / Qwen2.5-3B / Phi-4-mini (128K) / SmolLM3-3B;
pair Gemma-2-2B with an ~80 MB MiniLM embedder for vector intent retrieval; reserve
DeepSeek-R1-Distill (1.5B edge, 8B for the future NPU hardware tier) as the local
reasoning fallback before paying for cloud. On the future proprietary hardware, swap
the "cloud" step for a larger on-device model (8B-class on NPU) keeping the **same
cascade contract**. Runtimes: llama.cpp/Ollama (dev + Linux/Win wall units),
ExecuTorch or MediaPipe LLM Inference (production Android), MLC-LLM (GPU tablets).

**Privacy gate in front of every cloud hop:** never send raw
finance/health/TLS-key/private-memory content — redact to the minimal abstract
intent first.

---

## 4 · Defensive security hardening

> Mapped to Lar's actual architecture (client-side E2EE, Supabase auth, Next.js
> portal with CSP nonces, an MCP service). Defensive only.

### Critical

- **Non-extractable CryptoKeys** — derive/import the AES-GCM key with `extractable:false` and never `exportKey`, so an XSS payload can at most call a live key while the page is open, never exfiltrate raw bytes. Highest-leverage control for an E2EE product.
- **Opaque CryptoKey handles only** — persist keys as structured-clone CryptoKey handles in IndexedDB; never store key material/mnemonics/plaintext in localStorage/sessionStorage/cookies. A DB dump should yield no usable key.
- **Strict nonce-based CSP** — `script-src 'self' 'nonce-<random>' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; default-src 'self'; upgrade-insecure-requests`. Fresh per-request nonce. Removing `unsafe-inline` is the primary defense against key-abusing XSS.
- **RLS on every table** scoped `(select auth.uid()) = user_id`; treat RLS-off / public-readable tables as a release blocker. Even with E2EE payloads, row isolation must stop one user enumerating another's blobs/metadata. Gate with Supabase Security Advisor pre-deploy.
- **service_role key strictly server-side** — never in client bundles, `NEXT_PUBLIC_*`, MCP client paths, or git. It bypasses all RLS — one leak defeats RLS + E2EE metadata protection.
- **Supply chain** — install with `npm ci` against the committed lockfile, disable install lifecycle scripts (`npm config set ignore-scripts true`) to neutralize the postinstall-worm path, and run secret scanning (gitleaks + GitHub Push Protection) at pre-commit and in CI; enforce the staged-file privacy gate (require `clean`).

### High

- **Authenticate the MCP service** as a least-privilege boundary — verify the user's token (audience/issuer) on every call, scope each tool to minimum data, validate/size-limit inputs, never hold or log plaintext E2EE content. An unverified MCP layer is a confused-deputy pivot around RLS.
- **Wrap the data-encryption key** with a KEK derived from a passkey (WebAuthn PRF) or password KDF, so at-rest wrapped key + synced ciphertext are useless without the user's authenticator/secret.
- **Full secure-headers baseline** — HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, COOP/CORP same-origin, `X-Frame-Options: DENY`, and a deny-by-default `Permissions-Policy` granting only `microphone=(self)` while denying camera/geolocation/usb/serial.
- **Wall-mounted device hardening** — Android Lock Task/kiosk (single-app pin, credential-gated exit), step-up auth + idle auto-lock before money/health/memory, encrypt local storage at rest (Android FBE), bind keys to Keystore/StrongBox, and a remote-wipe/key-revocation path for a stolen unit.
- **Treat transcribed voice + LLM tool-call args as UNTRUSTED** — validate/whitelist against allowed actions, require explicit confirmation for state-changing or money/identity-adjacent actions (never auto-execute), never interpolate voice text into queries/shell/MCP calls unescaped.
- **Supabase auth surface** — leaked-password protection (HIBP), enforce MFA/passkeys, require AAL2 in RLS for money/health tables, short access-token lifetime + refresh rotation, harden forgot-password / MFA-enrollment against bypass.

### Medium

- **Automated self-audit in CI** — semgrep + ESLint security rules (SAST), OWASP ZAP baseline against a preview (DAST), security-header regression gating, and a CI step that greps the emitted client bundle for `NEXT_PUBLIC_`/`service_role` leakage.
- **Trusted Types** (`require-trusted-types-for 'script'`) to close the innerHTML/eval DOM-XSS class, CSP `report-to`, pinned exact dependency versions + publish cooldown, `@lar/`-scoped private packages (anti dependency-confusion), and an SBOM diffed each release.
- **Transport** — enforce TLS 1.2+ (prefer 1.3) with HSTS preload; run testssl.sh/SSLyze against portal + MCP in CI, failing on weak ciphers/downgrade/cert-chain issues.
