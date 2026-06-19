# 24 · Recon — deep second pass (curated repos)

> Provenance: a deeper, one-agent-per-repo second study of all 20 curated starred
> repos (the first pass is [`docs/22-recon-learnings.md`](22-recon-learnings.md)).
> This pass went past category lists into specific tools, schemas, and architecture
> mapped to Lar's actual gaps. Honest relevance per repo (most "awesome-X" lists are
> low-relevance; the value is concentrated). Pairs with the orchestration direction
> in [`docs/23-orchestration-builderbot.md`](23-orchestration-builderbot.md).

## The headline finding

**Lar has 11 connectors + an E2EE store + inert auth — but no connector _registry_,
no _action engine_, and no _voice brain_.** Those three are the next real pillar, and
the studies converge on one concrete stack for each rather than scattered options.

## Priority shortlist (12, prioritized)

### Orchestration core (the missing primitives)

1. **[medium] One connector/skill manifest + registry.** Adopt a `SKILL.md`
   progressive-disclosure manifest (frontmatter: `name`=trigger, `description`,
   `allowed-tools` as a **hard capability allowlist**, `model-tier`, lazy body) +
   a `registry.json` (`plugins[] {name, source, version, category, keywords[]}`).
   Pilot: rewrite **weather** as a manifest the router resolves by description.
   _(awesome-agent-skills · awesome-copilot · awesome-claude-code-subagents)_
2. **[medium] Split-privilege action engine — the LLM never calls a connector
   directly.** The model emits a typed `ActionIntent` discriminated union; a
   **separate executor** validates against a per-connector intent allowlist +
   max-per-turn cap, runs a sanitizer (strip exfil URLs, redact finance/health/
   memory), and enforces an un-overridable network-exfil denylist (`curl|bash`,
   upload) for third-party connectors. This is the privacy _guarantee_, not promise.
   _(awesome-copilot: gh-aw safe-outputs + tool-guardian)_

### Voice brain (the largest unbuilt pillar)

3. **[medium] Lock the local voice tier.** ADR rejecting cloud-only voice in favor of
   **whisper.cpp + Piper/Kokoro + openWakeWord**; benchmark **MNN** (8.6× prefill vs
   llama.cpp on Android, on-device ASR+TTS) vs llama.cpp on target tablet hardware
   before committing the RN inference bridge. Cloud tier: adopt the **Azure VoiceLive**
   event contract (duplex WS + semantic VAD + barge-in) so users can interrupt.
   Study **Operit AI** as a working Android wake→STT→tool→TTS reference.
   _(Awesome_APIs by-negation · deepseek-integration · sindresorhus/VoiceMode)_

### Home control

4. **[medium] One Home Assistant connector, not N vendor SDKs.** Integrate HA's local
   WebSocket/REST API (read-only state subscription first); spike MQTT auto-discovery
   so Lar entities surface in HA → HomeKit/Matter/Siri/Alexa for free. Collapses the
   whole module to one local-first connector — the cleanest "route outward, own
   nothing proprietary" embodiment. _(Awesome_APIs · sindresorhus · RuView)_

### Money + memory correctness (before real data flows)

6. **[quick-win] Money-safety primitives.** A shared `Money` type
   (`{minor: bigint, currency}`, integer minor-units), one `formatMoney()` with a
   pinned `Intl` rounding mode (lint-ban `Math.round`/`toFixed` on currency), and a
   `Number.isFinite()` sanitization pass in normalization so NaN/Infinity can't poison
   chart series / Set-dedup / sort comparators. _(wtfpython)_
7. **[medium] Ghostfolio money model.** Adopt its typed activity-ledger schema
   (`BUY/SELL/DIVIDEND/FEE/INTEREST` + per-activity currency + Account/Holding, no
   brokerage APIs) and compute TWR/MWR/Sharpe/MaxDrawdown in-process with
   `@railpath/finance-toolkit` — local, contribution-correct, Python-free. _(awesome-quant)_
8. **[medium] Letta-style memory-via-tools** for private memory: one always-in-context
   "household profile" core block + `memory_replace`/`archival_search` tools over the
   E2EE `@lar/store`, with `pgvector`/`pglite` + `bge-m3` on-device embeddings for
   semantic recall. _(e2b-awesome-ai-agents · supabase · deepseek-integration)_

### Build process / security gates

5. **[quick-win] Harden `.claude/settings.json`.** The deny-list blocks
   `*.local.yaml`/`.env` + destructive git but is **missing Read-deny for
   `*.key`/`*.pem`/secrets** and the network-exfil Bash patterns. Add them + a
   `sessionEnd` secrets-scan hook to mechanize the "require clean" push gate.
   _(awesome-copilot · model-foundry)_
6. **[medium] Port `model-foundry` to arm the disarmed fleet.** A unit-tested
   `determine_next() -> Decision` decider driven by a MANIFEST, **sealed prompts**
   (8-section, one-PR-each, halt-if-absent), and an **auto-merge envelope** (CI-green +
   LOC cap + deny-regex over `e2ee|crypto|auth|keys` paths + `requires-human` label +
   `mergeable=UNKNOWN` retry, workflow pinned to main) + a JSONL circuit-breaker
   kill-switch. A working clean-room version of exactly Lar's planned CI fleet. _(model-foundry)_
7. **[medium] Voice/agent security in CI + on-device.** Add **Agentic Radar** to the
   connector-merge CI (scan skill/MCP config, fail on high-severity OWASP-LLM/Agentic
   findings) and run **LLM Guard**'s ONNX prompt-injection + Anonymize/Secrets scanners
   on-device around every utterance; measure tablet CPU latency vs the voice-UX budget.
   _(Awesome-Hacking)_
8. **[quick-win] Runtime DAST gate** (the static CI lacks one): pinned `testssl.sh`
   (fail below A-) + `nuclei` against a preview deploy with a custom template asserting
   **money/health routes 401 unauthenticated**. _(awesome-pentest · Awesome-Hacking)_

### Design system

10. **[medium] One Leonardo generator replaces three hand-maintained token sets.**
    `@adobe/leonardo-contrast-colors` in `@life-os/ui` (key colors + target WCAG ratios
    once → emit dark/ember/light by flipping lightness) guarantees contrast on a
    glare-prone wall tablet. Then `@adobe/leonardo-mcp` as the first low-stakes
    read-only design MCP to prove the ACP+MCP-review loop. _(Awesome-Design-Tools)_

## Cross-repo themes

1. **The brain is the gap** — four repos hand Lar a near-complete on-device voice stack (STT/TTS/wake-word + MNN local LLM + a duplex barge-in protocol).
2. **Adopt one connector manifest before any orchestration** — five repos describe the same SKILL.md/registry pattern; the codebase confirms the gap.
3. **Split privilege from the model** — the action engine must never let the LLM call connectors directly (typed intent → validating executor → denylist).
4. **`model-foundry` is a working clean-room of Lar's planned CI fleet** — de-risks arming it.
5. **Money + memory need correctness/recall primitives** the demo generators lack (integer money, Ghostfolio ledger, Letta memory, pgvector).
6. **Integrate Home Assistant once, inherit every device + voice ecosystem.**
7. **One Leonardo generator can replace three hand-maintained theme token sets.**

## Per-repo verdicts (relevance · single best pick)

| repo                                     | rel.   | top pick                                                                                       |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| TonnyL/Awesome_APIs                      | low    | Home Assistant local WS/REST as ONE home-control connector; names Podcast Index/SimpleFIN gaps |
| RunaCapital/awesome-oss-alternatives     | low    | Activepieces MIT `pieces` (createAction/PieceAuth) as the skill-manifest reference             |
| VoltAgent/awesome-claude-code-subagents  | low    | `marketplace.json plugins[]` as the registry schema + local keyword-match router               |
| VoltAgent/awesome-agent-skills           | medium | SKILL.md progressive-disclosure manifest + Azure VoiceLive event contract                      |
| wilsonfreitas/awesome-quant              | medium | Ghostfolio activity-ledger model + `@railpath/finance-toolkit` (ignore the trading 90%)        |
| e2b-dev/awesome-ai-agents                | low    | Letta core/recall/archival memory-via-tools over the E2EE store; Langroid config seam          |
| github/awesome-copilot                   | medium | gh-aw safe-outputs + tool-guardian denylist = the action-engine safety architecture            |
| goabstract/Awesome-Design-Tools          | low    | `@adobe/leonardo-contrast-colors` to generate all three themes from key colors                 |
| tiimgreen/github-cheat-sheet             | low    | PR refspec + fixup/autosquash for the worktree-pool's one-clean-commit-per-increment           |
| enaqx/awesome-react                      | low    | spike `rxdb` (encryption + reactive + replication) as offline-first E2EE store; xstate turn    |
| sindresorhus/awesome                     | medium | awesome-home-assistant (Rhasspy/View Assist/Wall Panel — wall-tablet precedent) + VoiceMode    |
| p12hunter/model-foundry                  | medium | port the GH-Actions-only autonomy kit (decider + sealed prompts + auto-merge envelope)         |
| satwikkansal/wtfpython                   | low    | IEEE-754 money fixes (integer minor-units, pinned rounding, isFinite) as Vitest gotchas        |
| winsiderss/systeminformer                | low    | flat named-callback connector registry + bounded ring buffers for 24/7 tablet charts           |
| ruvnet/RuView                            | low    | in-RAM `Ephemeral<T>` + per-install keyed-hash rotating IDs (uncorrelatable logs) + MQTT       |
| deepseek-ai/awesome-deepseek-integration | medium | benchmark MNN local LLM (8.6× prefill) + Operit AI Android reference + bge-m3 embedder         |
| supabase/supabase                        | medium | RLS USING/WITH-CHECK isolation, declarative migration loop, pgvector recall, Broadcast         |
| DhanushNehru/Ultimate-Cybersecurity-Res. | low    | NVD CVE API (auto-disable a connector with a fresh critical CVE) + OWASP MASVS for RN          |
| Hack-with-Github/Awesome-Hacking         | medium | awesome-llm-security: LLM Guard + Agentic Radar + AgentDojo                                    |
| enaqx/awesome-pentest                    | low    | runtime DAST: pinned testssl.sh + nuclei (money/health must 401) + mat2/exiftool on ingest     |

> Full per-repo deep dives (with concrete first steps) are in the workflow output;
> this doc is the durable synthesis. Licensing: prefer the MIT/Apache options noted
> (Activepieces over n8n; permissive-only per CLAUDE.md).
