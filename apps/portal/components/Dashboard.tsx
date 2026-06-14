'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@lar/ui';
import { AgendaBlock } from './AgendaBlock';
import { BooksBlock } from './BooksBlock';
import { FilmBlock } from './FilmBlock';
import { MusicBlock } from './MusicBlock';
import { PodcastsBlock } from './PodcastsBlock';
import { WealthBlock } from './WealthBlock';
import { MarketsBlock } from './MarketsBlock';
import { OverviewBlock } from './OverviewBlock';
import { ThemeToggle } from './ThemeToggle';
import { SettingsDrawer } from './SettingsDrawer';
import { VaultPanel } from './VaultPanel';
import { RememberBlock } from './RememberBlock';
import { HealthBlock } from './HealthBlock';
import { WeatherBlock } from './WeatherBlock';
import { PlacesBlock } from './PlacesBlock';
import { DictionaryBlock } from './DictionaryBlock';

const TABS: ReadonlyArray<{ key: string; label: string; ico: IconName }> = [
  { key: 'home', label: 'Overview', ico: 'home' },
  { key: 'agenda', label: 'Agenda', ico: 'agenda' },
  { key: 'weather', label: 'Weather', ico: 'weather' },
  { key: 'place', label: 'Places', ico: 'places' },
  { key: 'music', label: 'Music', ico: 'music' },
  { key: 'podcasts', label: 'Podcasts', ico: 'podcasts' },
  { key: 'books', label: 'Books', ico: 'books' },
  { key: 'define', label: 'Dictionary', ico: 'dictionary' },
  { key: 'film', label: 'Film & TV', ico: 'film' },
  { key: 'wealth', label: 'Wealth', ico: 'wealth' },
  { key: 'markets', label: 'Markets', ico: 'markets' },
  { key: 'health', label: 'Health', ico: 'health' },
  { key: 'remember', label: 'Remember', ico: 'lock' },
  { key: 'connect', label: 'Connect', ico: 'connect' },
] as const;

type TabKey =
  | 'home'
  | 'agenda'
  | 'weather'
  | 'place'
  | 'music'
  | 'podcasts'
  | 'books'
  | 'define'
  | 'film'
  | 'wealth'
  | 'markets'
  | 'health'
  | 'remember'
  | 'connect';

export function Dashboard() {
  const [tab, setTab] = useState<TabKey>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app">
      <nav className="rail glass" aria-label="Primary">
        <div className="mark">
          <Icon name="mark" size={26} />
        </div>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`navbtn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key as TabKey)}
            aria-current={tab === t.key ? 'page' : undefined}
            aria-label={`Open ${t.label} tab`}
            type="button"
          >
            <span className="ico" aria-hidden>
              <Icon name={t.ico} size={20} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="theme-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Appearance settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          title="Appearance settings"
        >
          <span aria-hidden>
            <Icon name="settings" size={22} />
          </span>
        </button>
        <ThemeToggle />
        <div className="avatar">AM</div>
      </nav>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <main className="stage glass">
        <div key={tab} className="stage-anim">
          {tab === 'home' && <OverviewBlock onNavigate={(t) => setTab(t as TabKey)} />}
          {tab === 'agenda' && <AgendaBlock />}
          {tab === 'weather' && <WeatherBlock />}
          {tab === 'place' && <PlacesBlock />}
          {tab === 'music' && <MusicBlock />}
          {tab === 'podcasts' && <PodcastsBlock />}
          {tab === 'books' && <BooksBlock />}
          {tab === 'define' && <DictionaryBlock />}
          {tab === 'film' && <FilmBlock />}
          {tab === 'wealth' && <WealthBlock />}
          {tab === 'markets' && <MarketsBlock />}
          {tab === 'health' && <HealthBlock />}
          {tab === 'remember' && <RememberBlock />}
          {tab === 'connect' && <VaultPanel />}
        </div>
      </main>
    </div>
  );
}
