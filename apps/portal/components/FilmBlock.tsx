'use client';

// Use the connector's exported (total) resolution type so the contract — every
// watch link is always present — propagates end-to-end and the primary
// "Where to watch" CTA can never silently disappear behind a Partial.
import type { FilmResolution } from '@lar/connector-filmtv';
import { AskBar } from './AskBar';
import { useAskLar } from '../lib/useAskLar';

export function FilmBlock() {
  // "Dune movie" (not bare "Dune") so the Wikipedia card resolves the film,
  // not the sand-dune geography article. JustWatch handles the real lookup.
  const ask = useAskLar<FilmResolution>({
    kind: 'film',
    forceDomain: 'film',
    initial: 'Dune movie',
  });

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Film &amp; TV</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a film or show. Lar finds it on Wikipedia and routes you to JustWatch or your
        preferred streaming service — it never hosts or streams video itself.
      </p>

      <AskBar
        value={ask.text}
        onChange={ask.setText}
        onSubmit={() => ask.run(ask.text)}
        onMic={ask.mic}
        loading={ask.loading}
        listening={ask.listening}
        placeholder="Dune movie"
      />

      {ask.msg && <div className="err">{ask.msg}</div>}

      {ask.res && (
        <div className="np card">
          <div className="np-head">
            {ask.res.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ask.res.thumbnailUrl}
                alt=""
                className="cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="np-title">{ask.res.title}</div>
              {ask.res.description && <div className="np-artist">{ask.res.description}</div>}
            </div>
          </div>

          {/* PRIMARY: JustWatch — the neutral aggregator, where the user picks where to watch */}
          {ask.res.links.justwatch && (
            <a className="open" href={ask.res.links.justwatch} target="_blank" rel="noreferrer">
              Where to watch →
            </a>
          )}

          <div className="avail">
            <span className="avail-l">Find on</span>
            {ask.res.links.netflix && (
              <a href={ask.res.links.netflix} target="_blank" rel="noreferrer" className="chip">
                Netflix
              </a>
            )}
            {ask.res.links.prime_video && (
              <a href={ask.res.links.prime_video} target="_blank" rel="noreferrer" className="chip">
                Prime Video
              </a>
            )}
            {ask.res.links.disney_plus && (
              <a href={ask.res.links.disney_plus} target="_blank" rel="noreferrer" className="chip">
                Disney+
              </a>
            )}
            {ask.res.links.apple_tv && (
              <a href={ask.res.links.apple_tv} target="_blank" rel="noreferrer" className="chip">
                Apple TV
              </a>
            )}
            {ask.res.links.youtube && (
              <a href={ask.res.links.youtube} target="_blank" rel="noreferrer" className="chip">
                YouTube
              </a>
            )}
            {ask.res.links.letterboxd && (
              <a href={ask.res.links.letterboxd} target="_blank" rel="noreferrer" className="chip">
                Letterboxd
              </a>
            )}
          </div>

          <div className="avail" style={{ marginTop: '0.5rem' }}>
            <a href={ask.res.wikipediaUrl} target="_blank" rel="noreferrer" className="chip">
              Wikipedia ↗
            </a>
          </div>

          <div className="note">
            Lar routes you out — it never hosts or streams video. Where-to-watch is JustWatch&apos;s
            neutral index; you choose.
          </div>
        </div>
      )}
    </div>
  );
}
