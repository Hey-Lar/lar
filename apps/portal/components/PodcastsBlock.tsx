'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@lar/ui';
import type { PodcastResolution } from '@lar/connector-podcasts';
import { AskBar } from './AskBar';
import { useAskLar } from '../lib/useAskLar';

export function PodcastsBlock() {
  const ask = useAskLar<PodcastResolution>({
    kind: 'podcast',
    forceDomain: 'podcast',
    initial: 'find the Lex Fridman podcast',
  });
  const [copied, setCopied] = useState(false);
  // Clear the "Copied" reset-timer on unmount (the ask-bar request is aborted
  // by useAskLar; this timer is block-local so it needs its own cleanup).
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  async function copyRss(feedUrl: string) {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      // Cancel any prior reset still pending — keeps the "Copied" state visible
      // for exactly 2s after the LATEST copy click instead of an earlier one,
      // and the unmount-effect above clears the handle if we navigate away.
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => {
        copyResetRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      ask.setMsg('Could not copy — please copy the URL manually.');
    }
  }

  const res = ask.res;
  const feedUrl = res?.links.rss ?? res?.feedUrl;
  const appleUrl = res?.links.apple_podcasts ?? res?.applePodcastsUrl;

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Podcasts</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a podcast you want. Lar finds it and routes you to Apple Podcasts or your feed
        reader — it never streams audio itself.
      </p>

      <AskBar
        value={ask.text}
        onChange={ask.setText}
        onSubmit={() => ask.run(ask.text)}
        onMic={ask.mic}
        loading={ask.loading}
        listening={ask.listening}
        placeholder="find the Lex Fridman podcast"
      />

      {ask.msg && (
        <div className="err" role="status" aria-live="polite">
          {ask.msg}
        </div>
      )}

      {res && (
        <div className="np card">
          <div className="np-head">
            {res.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={res.artworkUrl}
                alt=""
                className="cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="np-title">{res.title}</div>
              <div className="np-artist">{res.author}</div>
            </div>
          </div>

          {appleUrl && (
            <a className="open" href={appleUrl} target="_blank" rel="noreferrer">
              Open in Apple Podcasts <Icon name="route" size={14} className="chip-arrow" />
            </a>
          )}

          {feedUrl && (
            <button
              className="chip"
              style={{ alignSelf: 'flex-start', cursor: 'pointer', border: 'none' }}
              onClick={() => void copyRss(feedUrl)}
            >
              {copied ? (
                <>
                  Copied <Icon name="check" size={14} className="chip-arrow" />
                </>
              ) : (
                'Copy RSS feed'
              )}
            </button>
          )}

          {(res.links.spotify || res.links.youtube) && (
            <div className="avail">
              <span className="avail-l">Find on</span>
              {res.links.spotify && (
                <a href={res.links.spotify} target="_blank" rel="noreferrer" className="chip">
                  Spotify
                </a>
              )}
              {res.links.youtube && (
                <a href={res.links.youtube} target="_blank" rel="noreferrer" className="chip">
                  YouTube
                </a>
              )}
            </div>
          )}

          <div className="note">
            Lar routes you out — it never streams audio. Read-only · your algorithm.
          </div>
        </div>
      )}
    </div>
  );
}
