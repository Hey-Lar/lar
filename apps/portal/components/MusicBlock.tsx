'use client';

import { Icon } from '@lar/ui';
import type { MusicResolution } from '@lar/connector-music';
import { AskBar } from './AskBar';
import { useAskLar } from '../lib/useAskLar';

const LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  tidal: 'Tidal',
  youtube_music: 'YouTube Music',
  soundcloud: 'SoundCloud',
  deezer: 'Deezer',
  amazon_music: 'Amazon Music',
  odesli: 'Songlink',
};
const label = (p: string) => LABELS[p] ?? p;

export function MusicBlock() {
  const ask = useAskLar<MusicResolution>({
    kind: 'music',
    forceDomain: 'music',
    initial: 'play something calm on Tidal',
  });

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Music</h1>
        </div>
      </div>
      <p className="lead">
        Say or type what you want. Lar finds the track and routes you to the best place to play it —
        your platform, your choice. Lar never plays the audio itself; it takes you to the official
        app.
      </p>

      <AskBar
        value={ask.text}
        onChange={ask.setText}
        onSubmit={() => ask.run(ask.text)}
        onMic={ask.mic}
        loading={ask.loading}
        listening={ask.listening}
        placeholder="play something calm on Tidal"
      />

      {ask.msg && <div className="err">{ask.msg}</div>}

      {ask.res && (
        <div className="np card">
          <div className="np-head">
            {ask.res.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ask.res.artworkUrl}
                alt=""
                className="cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="np-title">{ask.res.title}</div>
              <div className="np-artist">{ask.res.artist}</div>
              <div className="np-route">
                Routing to <b>{label(ask.res.chosenPlatform)}</b>
              </div>
            </div>
          </div>
          <a className="open" href={ask.res.openUrl} target="_blank" rel="noreferrer">
            Open in {label(ask.res.chosenPlatform)}{' '}
            <Icon name="route" size={14} className="chip-arrow" />
          </a>
          <div className="avail">
            <span className="avail-l">Available on</span>
            {Object.entries(ask.res.links).map(([p, url]) => (
              <a key={p} href={url} target="_blank" rel="noreferrer" className="chip">
                {label(p)}
              </a>
            ))}
          </div>
          <div className="note">
            Lar resolves + routes — it never hosts or streams audio. Read-only · your algorithm.
          </div>
        </div>
      )}
    </div>
  );
}
