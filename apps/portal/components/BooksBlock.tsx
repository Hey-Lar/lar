'use client';

import { Icon } from '@lar/ui';
import type { BookResolution } from '@lar/connector-books';
import { AskBar } from './AskBar';
import { useAskLar } from '../lib/useAskLar';

export function BooksBlock() {
  const ask = useAskLar<BookResolution>({
    kind: 'book',
    forceDomain: 'book',
    initial: 'the pragmatic programmer',
  });

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Books</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a book you want. Lar finds it on Open Library and routes you to your library or
        preferred store — it never hosts or sells books itself.
      </p>

      <AskBar
        value={ask.text}
        onChange={ask.setText}
        onSubmit={() => ask.run(ask.text)}
        onMic={ask.mic}
        loading={ask.loading}
        listening={ask.listening}
        placeholder="the pragmatic programmer"
      />

      {ask.msg && (
        <div className="err" role="status" aria-live="polite">
          {ask.msg}
        </div>
      )}

      {ask.res && (
        <div className="np card">
          <div className="np-head">
            {ask.res.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ask.res.coverUrl}
                alt=""
                className="cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="np-title">{ask.res.title}</div>
              <div className="np-artist">
                {ask.res.author}
                {ask.res.year ? ` · ${ask.res.year}` : ''}
              </div>
            </div>
          </div>

          {/* PRIMARY: library-first — the standout, free, anti-lock-in link */}
          {ask.res.links.library && (
            <a className="open" href={ask.res.links.library} target="_blank" rel="noreferrer">
              Borrow from a library <Icon name="route" size={14} className="chip-arrow" />
            </a>
          )}

          <div className="avail">
            <span className="avail-l">Find on</span>
            {ask.res.links.open_library && (
              <a
                href={ask.res.links.open_library}
                target="_blank"
                rel="noreferrer"
                className="chip"
              >
                Open Library
              </a>
            )}
            {ask.res.links.apple_books && (
              <a href={ask.res.links.apple_books} target="_blank" rel="noreferrer" className="chip">
                Apple Books
              </a>
            )}
            {ask.res.links.kindle && (
              <a href={ask.res.links.kindle} target="_blank" rel="noreferrer" className="chip">
                Kindle
              </a>
            )}
            {ask.res.links.kobo && (
              <a href={ask.res.links.kobo} target="_blank" rel="noreferrer" className="chip">
                Kobo
              </a>
            )}
            {ask.res.links.google_books && (
              <a
                href={ask.res.links.google_books}
                target="_blank"
                rel="noreferrer"
                className="chip"
              >
                Google Books
              </a>
            )}
          </div>

          <div className="note">
            Lar routes you out — it never hosts or sells books. Library-first, your choice.
          </div>
        </div>
      )}
    </div>
  );
}
