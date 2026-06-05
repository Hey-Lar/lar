'use client';

import { useState } from 'react';
import { MusicBlock } from './MusicBlock';
import { WealthBlock } from './WealthBlock';

const TABS = [
  { key: 'home', label: 'Home', ico: '⌂' },
  { key: 'music', label: 'Music', ico: '♪' },
  { key: 'wealth', label: 'Wealth', ico: '◈' },
  { key: 'health', label: 'Health', ico: '♥' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function Dashboard() {
  const [tab, setTab] = useState<TabKey>('music');

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
            >
              <span className="ico" aria-hidden>
                {t.ico}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
          <div className="avatar">AM</div>
        </nav>

        <main className="stage glass">
          {tab === 'music' && <MusicBlock />}
          {tab === 'wealth' && <WealthBlock />}
          {tab === 'home' && <HomeBlock />}
          {tab === 'health' && <HealthBlock />}
        </main>
      </div>
    </div>
  );
}

function HomeBlock() {
  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Good evening</div>
          <h1 className="h1">Home</h1>
        </div>
      </div>
      <p className="lead">
        Lights, climate, scenes and presence — backed by Matter, controlled by voice. Arriving with
        the Android phase; here is the surface it lives in.
      </p>
      <div className="tiles">
        <div className="card">
          <div className="eyebrow">Living room</div>
          <div className="tile-big">21°</div>
          <div className="note">3 lights · warm</div>
        </div>
        <div className="card">
          <div className="eyebrow">Scene</div>
          <div className="tile-big">Evening</div>
          <div className="note">dimmed · doors locked</div>
        </div>
      </div>
    </div>
  );
}

function HealthBlock() {
  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Local-first · private</div>
          <h1 className="h1">Health</h1>
        </div>
      </div>
      <p className="lead">
        Steps, sleep and rings from Health Connect / wearables — kept on-device, never sold. A later
        block; the data stays yours.
      </p>
      <div className="tiles">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div className="ring" style={{ ['--p' as string]: '68%' }}>
            <i>68%</i>
          </div>
          <div>
            <div className="eyebrow">Move</div>
            <div className="note">5,400 / 8,000 steps</div>
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Sleep</div>
          <div className="tile-big">7h 12m</div>
          <div className="note">last night</div>
        </div>
      </div>
    </div>
  );
}
