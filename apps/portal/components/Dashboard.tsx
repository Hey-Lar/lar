'use client';

import { useState } from 'react';
import { AgendaBlock } from './AgendaBlock';
import { BooksBlock } from './BooksBlock';
import { FilmBlock } from './FilmBlock';
import { MusicBlock } from './MusicBlock';
import { PodcastsBlock } from './PodcastsBlock';
import { WealthBlock } from './WealthBlock';
import { MarketsBlock } from './MarketsBlock';
import { OverviewBlock } from './OverviewBlock';
import { ThemeToggle } from './ThemeToggle';
import { VaultPanel } from './VaultPanel';
import { HealthBlock } from './HealthBlock';
import { WeatherBlock } from './WeatherBlock';
import { PlacesBlock } from './PlacesBlock';

const TABS = [
  { key: 'home', label: 'Overview', ico: '◫' },
  { key: 'agenda', label: 'Agenda', ico: '⌖' },
  { key: 'weather', label: 'Weather', ico: '⛅' },
  { key: 'place', label: 'Places', ico: '📍' },
  { key: 'music', label: 'Music', ico: '♪' },
  { key: 'podcasts', label: 'Podcasts', ico: '🎙' },
  { key: 'books', label: 'Books', ico: '📚' },
  { key: 'film', label: 'Film & TV', ico: '🎬' },
  { key: 'wealth', label: 'Wealth', ico: '◈' },
  { key: 'markets', label: 'Markets', ico: '📈' },
  { key: 'health', label: 'Health', ico: '♥' },
  { key: 'connect', label: 'Connect', ico: '🔒' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function Dashboard() {
  const [tab, setTab] = useState<TabKey>('home');

  return (
    <div className="bg-mesh">
      <div className="blob m1" />
      <div className="blob m2" />
      <div className="grain" />
      <div className="app">
        <nav className="rail glass" aria-label="Primary">
          <div className="mark">◆</div>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`navbtn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? 'page' : undefined}
              aria-label={`Open ${t.label} tab`}
              type="button"
            >
              <span className="ico" aria-hidden>
                {t.ico}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
          <ThemeToggle />
          <div className="avatar">AM</div>
        </nav>

        <main className="stage glass">
          {tab === 'home' && <OverviewBlock onNavigate={(t) => setTab(t as TabKey)} />}
          {tab === 'agenda' && <AgendaBlock />}
          {tab === 'weather' && <WeatherBlock />}
          {tab === 'place' && <PlacesBlock />}
          {tab === 'music' && <MusicBlock />}
          {tab === 'podcasts' && <PodcastsBlock />}
          {tab === 'books' && <BooksBlock />}
          {tab === 'film' && <FilmBlock />}
          {tab === 'wealth' && <WealthBlock />}
          {tab === 'markets' && <MarketsBlock />}
          {tab === 'health' && <HealthBlock />}
          {tab === 'connect' && <VaultPanel />}
        </main>
      </div>
    </div>
  );
}
