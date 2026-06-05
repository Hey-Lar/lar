'use client';

import { useEffect, useState } from 'react';

interface Snapshot {
  netWorthEur: number;
  buckets: { cash: number; investments: number; property: number; liabilities: number };
  emergencyFundMonths: number | null;
}

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

const BUCKETS = [
  ['Cash', 'cash'],
  ['Investments', 'investments'],
  ['Assets', 'property'],
  ['Liabilities', 'liabilities'],
] as const;

export function WealthBlock() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/finance')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setConnected(Boolean(d.connected));
        setSnap(d.snapshot ?? null);
      })
      .catch(() => alive && setConnected(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Read-only · view only</div>
          <h1 className="h1">Wealth</h1>
        </div>
      </div>

      {connected === null && <p className="lead">Loading…</p>}

      {connected === false && (
        <div className="card shell">
          <p className="lead" style={{ margin: 0 }}>
            Not connected. Point <code>LUMINA_API_BASE</code> at your running Lumina API to see your
            real net worth here — aggregated <b>read-only</b>, never moved. This is the money pillar
            we already built, flowing straight into Lar.
          </p>
        </div>
      )}

      {connected && snap && (
        <>
          <div className="card hero">
            <div className="eyebrow">Net worth</div>
            <div className="bignum">{eur(snap.netWorthEur)}</div>
            {snap.emergencyFundMonths != null && (
              <div className="sub">
                {snap.emergencyFundMonths.toFixed(1)} months of emergency runway
              </div>
            )}
          </div>
          <div className="bucket-grid">
            {BUCKETS.map(([labelText, key]) => (
              <div key={key} className="card">
                <div className="eyebrow">{labelText}</div>
                <div className="midnum">{eur(snap.buckets[key])}</div>
              </div>
            ))}
          </div>
          <div className="note">
            From your own Lumina snapshot · read-only aggregation · no advice, no money movement.
          </div>
        </>
      )}
    </div>
  );
}
