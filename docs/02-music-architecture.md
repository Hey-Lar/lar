# Music Block — Reference Architecture

The music block is a **control + intelligence layer**, never a player. The AI decides _what_ and _where_; official apps do the streaming and DRM. Everything degrades gracefully down a fixed hierarchy so it works on day one and gets richer as access allows. **This is the reference implementation — every other block is this pattern with different data sources and adapters.**

---

## 1. Three separated stages

```
   "Hey Lar, play X on Tidal"  /  touch
        │
        ▼
 ┌──────────┐   ┌────────────┐   ┌──────────────────┐
 │  BRAIN   │ → │ DISPATCHER │ → │ SERVICE ADAPTERS │
 └──────────┘   └────────────┘   └──────────────────┘
```

The brain never touches audio or scrapes catalog data — it emits a **structured action**, and the dispatcher executes it through the best available mechanism.

---

## 2. Command hierarchy (try top → bottom, per service)

| Rung | Mechanism                                       | What it does                                  | Limit                                    |
| ---- | ----------------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| 1    | Deep link                                       | Launch app to a track/artist                  | Free, universal, launch-only             |
| 2    | MediaController (Android system session)        | Read now-playing + play/pause/skip to any app | Free, Android, needs notification access |
| 3    | Official remote API (Spotify Connect, MusicKit) | Search, queue, transfer, full control         | Needs auth + often Premium               |
| 4    | AI UI automation (AccessibilityService)         | Model taps the screen                         | Brittle, ToS gray — last resort          |

---

## 3. Per-service routing matrix

| Service       | Deep link | MediaController |             Rich API             | Recommendation data |
| ------------- | :-------: | :-------------: | :------------------------------: | ------------------- |
| Spotify       |     ✓     |        ✓        | ✓ (Premium; hostile to new apps) | ✗ use own           |
| Apple Music   |     ✓     |        ✓        |      ✓ MusicKit (most open)      | partial; prefer own |
| Tidal         |     ✓     |        ✓        |        ~ partner/limited         | ✗ use own           |
| YouTube Music |     ✓     |        ✓        |        ✗ none → rung 2/4         | ✗ use own           |
| SoundCloud    |     ✓     |        ✓        |       ~ closed to new apps       | own + public meta   |
| Podcasts      |     ✓     |        ✓        |     open RSS — fully ownable     | ✓ trivially yours   |
| Audiobooks    |     ✓     |        ✓        |        ✗ → deep link + UI        | own meta            |

**Launch + system control covers ~everything on Android.** Recommendation data is _always_ your own.

---

## 4. Intent pipeline

```
1. WAKE/INPUT      "Hey Lar, play something calm on Tidal"
2. LOCAL MODEL     parse intent + slots {action:play, entity:"calm", platform:tidal}
3. RESOLVE         own catalog + Odesli (ISRC) → canonical track + all platforms
4. PLATFORM PICK   user prefs ∩ availability ∩ subscription tier (explicit overrides)
5. CONFIDENCE GATE high+simple → run; ambiguous/reasoning → escalate to cloud
6. DISPATCH        highest available rung for that service
7. EXECUTE+RENDER  fire; draw glass now-playing widget (state from MediaController)
8. FEEDBACK        log to YOUR preference store (your algorithm's training data)
```

---

## 5. Structured-action contract (the interface everything speaks)

The brain emits this; the dispatcher, the "Hey Lar" mic, and the Zapier/MCP layer all consume it.

```json
{
  "intent": "play | pause | next | queue | open | recommend",
  "domain": "music | podcast | film | book",
  "entity": { "type": "track|artist|album|show", "query": "string", "id": "isrc|null" },
  "platform": "auto | spotify | apple_music | tidal | youtube_music | soundcloud",
  "modifiers": ["calm", "explicit:false"],
  "target_device": "this | speaker_kitchen | null",
  "confidence": 0.0
}
```

---

## 6. Recommendation brain (the moat)

Runs on **your own data**, immune to API crackdowns: ListenBrainz (listening signals), MusicBrainz (metadata), Odesli (cross-platform IDs), your own play history, optional audio embeddings. **User-controlled weights.** Spotify deprecated its recommendation/audio endpoints for new apps (2024–26) — so never depend on them.

---

## 7. Build order

1. Deep-link launcher + Odesli resolver + glass UI → works for everyone, day one.
2. MediaController now-playing + transport control (Android).
3. Local "Hey Lar" intent model (voice).
4. Own recommendation layer.
5. Cloud escalation for hard requests.
6. Official remote APIs where worth it (Apple MusicKit first).
7. UI-automation fallback for holdouts (YT Music).

---

## 8. Risk flags

- Spotify hostile to new apps → never depend on its data.
- YouTube Music: no official control API → rungs 2/4.
- UI automation brittle + ToS gray → escape hatch only.
- iOS sandbox → full control needs Android/AOSP.
- The real wall is **platform terms + access tiers**, not copyright — degrade gracefully.
