import { NextResponse } from 'next/server';
import type { Platform } from '@lar/shared';
import { parseIntentDeterministic, resolveMusic } from '@lar/connector-music';
import { resolvePodcast } from '@lar/connector-podcasts';
import { resolveBook } from '@lar/connector-books';
import { resolveFilm } from '@lar/connector-filmtv';
import { resolvePlace } from '@lar/connector-places';
import { resolveWord } from '@lar/connector-dictionary';
import { DEFAULT_PLATFORM_PRIORITY } from '../../../lib/prefs';
import { authorize } from '../../../lib/authz';

/**
 * "Hey Lar" → action → dispatch.
 *
 * Keyless brain: the deterministic parser turns a transcript into a LarAction.
 * (Cloud escalation to the Claude API plugs in HERE when LAR_ANTHROPIC_KEY is
 * set and confidence is low — server-side only, never expose the key.) The
 * Music connector then resolves + routes to a deep link. No audio, ever.
 */
export async function POST(req: Request) {
  const gate = authorize(req, { allow: ['POST'] });
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as {
      transcript?: string;
      platformPriority?: Platform[];
      forceDomain?: 'music' | 'podcast' | 'book' | 'film' | 'place' | 'define';
    };
    const transcript = body.transcript?.trim();
    if (!transcript) {
      return NextResponse.json({ ok: false, error: 'empty transcript' }, { status: 400 });
    }

    const action = parseIntentDeterministic(transcript);

    // Allow the client to override the parsed domain (e.g. PodcastsBlock always
    // forces 'podcast' so the same deterministic parser routes correctly).
    const routed = body.forceDomain ? { ...action, domain: body.forceDomain } : action;

    // Phase 1 handles media-launch intents; transport (pause/next) arrives with
    // the Android MediaController phase, so we surface a note rather than guess.
    // Launchable = a routable media domain (music/podcast/book/film) paired with
    // a launch-style intent (play/open/recommend/queue); anything else gets a note.
    const launchable =
      (routed.domain === 'music' ||
        routed.domain === 'podcast' ||
        routed.domain === 'book' ||
        routed.domain === 'film' ||
        routed.domain === 'place' ||
        routed.domain === 'define') &&
      (routed.intent === 'play' ||
        routed.intent === 'open' ||
        routed.intent === 'recommend' ||
        routed.intent === 'queue');

    if (!launchable) {
      return NextResponse.json({
        ok: true,
        kind: routed.domain,
        action: routed,
        resolution: null,
        note: `"${routed.intent}" on ${routed.domain} arrives with the Android phase (system control). Phase 1 routes music launches.`,
      });
    }

    if (routed.domain === 'podcast') {
      const resolution = await resolvePodcast(routed);
      return NextResponse.json({ ok: true, kind: 'podcast', action: routed, resolution });
    }

    if (routed.domain === 'book') {
      const resolution = await resolveBook(routed);
      return NextResponse.json({ ok: true, kind: 'book', action: routed, resolution });
    }

    if (routed.domain === 'film') {
      const resolution = await resolveFilm(routed);
      return NextResponse.json({ ok: true, kind: 'film', action: routed, resolution });
    }

    if (routed.domain === 'place') {
      // Nominatim fetch runs server-side only — browser calls same-origin /api/lar.
      // Bright-line: links only, Lar never stores or transmits the user's location.
      const resolution = await resolvePlace(routed);
      return NextResponse.json({ ok: true, kind: 'place', action: routed, resolution });
    }

    if (routed.domain === 'define') {
      // dictionaryapi.dev fetch runs server-side only — browser calls same-origin /api/lar.
      // Bright-line: read-only, keyless open-dictionary data; links only.
      const resolution = await resolveWord(routed);
      return NextResponse.json({ ok: true, kind: 'define', action: routed, resolution });
    }

    // Default: music routing (back-compat — resolution field always present).
    const resolution = await resolveMusic(routed, {
      platformPriority: body.platformPriority ?? DEFAULT_PLATFORM_PRIORITY,
    });
    return NextResponse.json({ ok: true, kind: 'music', action: routed, resolution });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
