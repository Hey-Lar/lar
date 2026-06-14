'use client';

/**
 * BRIGHT-LINE: pure route-outward. No host, no rank, no editorialising, no fetch.
 * For any topic, Lar routes you OUTWARD to a curated NEUTRAL set — aggregators, primary
 * wire services, a bias-aware comparison view, and reference archives. Keyless, nothing
 * stored, nothing tracked. The whole thesis in one Room.
 */

import { useMemo, useState } from 'react';
import { buildNewsLinks, type NewsKind } from '@lar/connector-news';

const GROUPS: ReadonlyArray<{ kind: NewsKind; title: string }> = [
  { kind: 'aggregator', title: 'See the spread' },
  { kind: 'bias-aware', title: 'Compare the slant' },
  { kind: 'wire', title: 'Go to the primary source' },
  { kind: 'reference', title: 'Get the background' },
];

export function NewsBlock() {
  const [topic, setTopic] = useState('');
  const [submitted, setSubmitted] = useState('');

  const links = useMemo(() => (submitted ? buildNewsLinks(submitted) : []), [submitted]);

  function run() {
    const t = topic.trim();
    if (t) setSubmitted(t);
  }

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Neutral · keyless · routes outward</div>
          <h1 className="h1">News</h1>
        </div>
        <span className="badge demo">NO LOCK-IN</span>
      </div>

      <p className="lead">
        Lar doesn&rsquo;t host or rank the news. Name a topic and it routes you outward to a neutral
        set — including a bias-aware view that shows the same story across the spectrum. Nothing
        tracked, nothing stored.
      </p>

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="A topic, e.g. EU privacy regulation"
          aria-label="News topic"
        />
        <button type="submit" className="go">
          Find sources
        </button>
      </form>

      {submitted && (
        <>
          {GROUPS.map((g) => {
            const inGroup = links.filter((l) => l.kind === g.kind);
            if (inGroup.length === 0) return null;
            return (
              <div key={g.kind} style={{ marginTop: 18, maxWidth: 680 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {g.title}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {inGroup.map((l) => (
                    <a
                      key={l.id}
                      className="card"
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', textDecoration: 'none' }}
                    >
                      <div style={{ fontWeight: 600 }}>{l.label} →</div>
                      <div className="note" style={{ marginTop: 2 }}>
                        {l.why}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="note" style={{ marginTop: 18, maxWidth: 680 }}>
        Read-only · keyless · Lar never hosts or tracks. Sources are deep-linked searches you
        control.
      </div>
    </div>
  );
}
