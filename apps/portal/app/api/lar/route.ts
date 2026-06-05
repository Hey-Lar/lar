import { NextResponse } from 'next/server';
import type { Platform } from '@lar/shared';
import { parseIntentDeterministic, resolveMusic } from '@lar/connector-music';
import { DEFAULT_PLATFORM_PRIORITY } from '../../../lib/prefs';

/**
 * "Hey Lar" → action → dispatch.
 *
 * Keyless brain: the deterministic parser turns a transcript into a LarAction.
 * (Cloud escalation to the Claude API plugs in HERE when LAR_ANTHROPIC_KEY is
 * set and confidence is low — server-side only, never expose the key.) The
 * Music connector then resolves + routes to a deep link. No audio, ever.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { transcript?: string; platformPriority?: Platform[] };
    const transcript = body.transcript?.trim();
    if (!transcript) {
      return NextResponse.json({ ok: false, error: 'empty transcript' }, { status: 400 });
    }

    const action = parseIntentDeterministic(transcript);

    // Phase 1 handles media-launch intents; transport (pause/next) arrives with
    // the Android MediaController phase, so we surface a note rather than guess.
    const launchable =
      action.domain === 'music' &&
      (action.intent === 'play' ||
        action.intent === 'open' ||
        action.intent === 'recommend' ||
        action.intent === 'queue');
    if (!launchable) {
      return NextResponse.json({
        ok: true,
        action,
        resolution: null,
        note: `"${action.intent}" on ${action.domain} arrives with the Android phase (system control). Phase 1 routes music launches.`,
      });
    }

    const resolution = await resolveMusic(action, {
      platformPriority: body.platformPriority ?? DEFAULT_PLATFORM_PRIORITY,
    });
    return NextResponse.json({ ok: true, action, resolution });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
