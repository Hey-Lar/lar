'use client';

/**
 * BRIGHT-LINE: read-only, keyless, route-outward.
 * Fetches /api/translate (server-side MyMemory, no key, no token) for a quick
 * translation, then routes you OUTWARD to dedicated translators (DeepL, Google,
 * WordReference). The browser only calls same-origin (CSP connect-src unchanged).
 * Lar stores nothing — no text, no history.
 */

import { useRef, useState } from 'react';
import { LANGS, type TranslateResult } from '@lar/connector-translate';

const OUTWARD: ReadonlyArray<{ key: keyof TranslateResult['links']; label: string }> = [
  { key: 'deepl', label: 'DeepL' },
  { key: 'google', label: 'Google Translate' },
  { key: 'wordreference', label: 'WordReference' },
];

export function TranslateBlock() {
  const [text, setText] = useState('');
  const [from, setFrom] = useState('en');
  const [to, setTo] = useState('es');
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function run() {
    const q = text.trim();
    if (!q) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    fetch(`/api/translate?q=${encodeURIComponent(q)}&from=${from}&to=${to}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data: { ok: boolean; result?: TranslateResult; error?: string }) => {
        if (ctrl.signal.aborted) return;
        if (data.ok && data.result) {
          setResult(data.result);
          setError(null);
        } else {
          setResult(null);
          setError(data.error ?? 'Could not translate.');
        }
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setResult(null);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setResult(null);
  }

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Live · keyless · routes outward</div>
          <h1 className="h1">Translate</h1>
        </div>
        <span className="badge live">MYMEMORY</span>
      </div>

      <p className="lead">
        A quick translation, then the door to the best translators for deeper work — no account, no
        tracking. Lar stores nothing.
      </p>

      <div className="card" style={{ maxWidth: 620, marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="tr-text" className="eyebrow">
            Text to translate
          </label>
          <input
            id="tr-text"
            type="text"
            placeholder="e.g. good morning"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run();
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="tr-from" className="eyebrow">
              From
            </label>
            <select id="tr-from" value={from} onChange={(e) => setFrom(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={swap}
            aria-label="Swap languages"
            style={{ marginBottom: 2 }}
          >
            ⇄
          </button>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="tr-to" className="eyebrow">
              To
            </label>
            <select id="tr-to" value={to} onChange={(e) => setTo(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={run}
            disabled={loading || text.trim().length === 0}
            style={{ marginLeft: 'auto', marginBottom: 2 }}
          >
            {loading ? 'Translating…' : 'Translate'}
          </button>
        </div>
      </div>

      {error && (
        <p className="err" role="alert" style={{ maxWidth: 620 }}>
          {error}
        </p>
      )}

      {result && (
        <div className="card" style={{ maxWidth: 620, marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {result.from} → {result.to}
            {typeof result.match === 'number' && ` · ${Math.round(result.match * 100)}% match`}
          </div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              lineHeight: 1.25,
            }}
          >
            {result.translated}
          </div>
          <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {OUTWARD.map((o) => (
              <a
                key={o.key}
                className="chip"
                href={result.links[o.key]}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in {o.label} →
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="note" style={{ maxWidth: 620 }}>
        Quick translation via MyMemory (keyless), fetched server-side. For nuanced work, Lar routes
        you outward — read-only, nothing stored.
      </div>
    </div>
  );
}
