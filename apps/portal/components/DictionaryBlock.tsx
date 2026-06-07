'use client';

import { Icon } from '@lar/ui';
import type { WordResolution } from '@lar/connector-dictionary';
import { AskBar } from './AskBar';
import { useAskLar } from '../lib/useAskLar';

export function DictionaryBlock() {
  const ask = useAskLar<WordResolution>({
    kind: 'define',
    forceDomain: 'define',
    initial: 'serendipity',
  });

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Dictionary</h1>
        </div>
      </div>
      <p className="lead">
        Type or say a word. Lar looks it up via Wiktionary (keyless, open data) and routes you to
        your preferred dictionary — it never stores your queries.
      </p>

      <AskBar
        value={ask.text}
        onChange={ask.setText}
        onSubmit={() => ask.run(ask.text)}
        onMic={ask.mic}
        loading={ask.loading}
        listening={ask.listening}
        placeholder="serendipity"
      />

      {ask.msg && <div className="err">{ask.msg}</div>}

      {ask.res && (
        <div className="np card">
          <div className="np-head">
            <div>
              <div className="np-title">{ask.res.word}</div>
              {ask.res.phonetic && <div className="np-artist">{ask.res.phonetic}</div>}
            </div>
          </div>

          {ask.res.audioUrl && (
            <a
              href={ask.res.audioUrl}
              target="_blank"
              rel="noreferrer"
              className="chip"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}
            >
              <Icon name="play" size={14} /> Listen
            </a>
          )}

          {ask.res.senses.map((sense, si) => (
            <div key={si} style={{ marginTop: si === 0 ? 8 : 16 }}>
              <div className="eyebrow" style={{ fontStyle: 'italic', marginBottom: 4 }}>
                {sense.partOfSpeech}
              </div>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {sense.definitions.map((def, di) => (
                  <li key={di} style={{ marginTop: 6 }}>
                    <span>{def.definition}</span>
                    {def.example && (
                      <div className="np-artist" style={{ marginTop: 2, opacity: 0.65 }}>
                        &ldquo;{def.example}&rdquo;
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* PRIMARY: Wiktionary — neutral open-data dictionary, no commercial lock-in */}
          <a className="open" href={ask.res.links.wiktionary} target="_blank" rel="noreferrer">
            Open in Wiktionary <Icon name="route" size={14} className="chip-arrow" />
          </a>

          <div className="avail">
            <span className="avail-l">Find on</span>
            <a
              href={ask.res.links.merriam_webster}
              target="_blank"
              rel="noreferrer"
              className="chip"
            >
              Merriam-Webster
            </a>
            <a href={ask.res.links.google} target="_blank" rel="noreferrer" className="chip">
              Google
            </a>
          </div>

          <div className="note">
            Open dictionary data (Wiktionary via dictionaryapi.dev). Lar reads to show + routes out
            — read-only.
          </div>
        </div>
      )}
    </div>
  );
}
