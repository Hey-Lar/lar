// Pure-math drift detection. No I/O, no deps.
//
// Given current holdings + their target_weight rows, report which
// positions have drifted more than `bandPp` percentage points away
// from target. The long-term playbook uses ±5pp as the default
// rebalance band ("the M1 routine"). Positions without a target are
// ignored (you can park cash there manually).

export interface HoldingForDrift {
  symbol: string;
  market_value: number;
  target_weight?: number;
}

export interface DriftBreach {
  symbol: string;
  current_weight: number; // ratio in [0, 1]
  target_weight: number;
  drift_pp: number; // (current - target) * 100, signed
}

export interface DriftReport {
  total_equity: number; // sum(market_value) + cash
  band_pp: number;
  breaches: DriftBreach[];
  all_positions: DriftBreach[]; // including non-breached, for context
}

export function computeDrift(holdings: HoldingForDrift[], cash: number, bandPp = 5): DriftReport {
  const totalEquity = holdings.reduce((s, h) => s + h.market_value, 0) + cash;
  const targeted = holdings.filter((h) => h.target_weight !== undefined && h.target_weight > 0);

  const all: DriftBreach[] = targeted.map((h) => {
    const current = totalEquity > 0 ? h.market_value / totalEquity : 0;
    const driftPp = (current - h.target_weight!) * 100;
    return {
      symbol: h.symbol,
      current_weight: +current.toFixed(4),
      target_weight: h.target_weight!,
      drift_pp: +driftPp.toFixed(2),
    };
  });

  const breaches = all.filter((b) => Math.abs(b.drift_pp) >= bandPp);

  return {
    total_equity: +totalEquity.toFixed(2),
    band_pp: bandPp,
    breaches,
    all_positions: all,
  };
}

/**
 * Render a DriftReport as Markdown — used by both the CLI output and the
 * GitHub-issue body that the scheduled workflow opens.
 */
export function renderDriftMarkdown(r: DriftReport, currency: string): string {
  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtPp = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}pp`;
  const fmtCcy = (n: number) =>
    new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const lines: string[] = [];
  lines.push(`# Drift check — ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(`Total equity: **${fmtCcy(r.total_equity)}**`);
  lines.push(`Rebalance band: ±${r.band_pp}pp`);
  lines.push('');

  if (r.breaches.length === 0) {
    lines.push(`✅ **No positions breached the ±${r.band_pp}pp band.** Nothing to do.`);
    lines.push('');
  } else {
    lines.push(
      `⚠️ **${r.breaches.length} position${r.breaches.length === 1 ? '' : 's'} ` +
        `breached the ±${r.band_pp}pp band.**`,
    );
    lines.push('');
    lines.push(`| Symbol | Current | Target | Drift |`);
    lines.push(`|---|---:|---:|---:|`);
    for (const b of r.breaches) {
      lines.push(
        `| ${prettySymbol(b.symbol)} | ${fmtPct(b.current_weight)} | ` +
          `${fmtPct(b.target_weight)} | ${fmtPp(b.drift_pp)} |`,
      );
    }
    lines.push('');
    lines.push(`### Recommended action`);
    lines.push('');
    lines.push(
      `Run \`node --experimental-strip-types scripts/run-next-contribution.ts <amount>\` ` +
        `to compute a buy list. The long-term rule: rebalance by contribution, never by selling.`,
    );
    lines.push('');
  }

  if (r.all_positions.length > 0) {
    lines.push(`<details><summary>All targeted positions</summary>`);
    lines.push('');
    lines.push(`| Symbol | Current | Target | Drift |`);
    lines.push(`|---|---:|---:|---:|`);
    for (const b of r.all_positions) {
      lines.push(
        `| ${prettySymbol(b.symbol)} | ${fmtPct(b.current_weight)} | ` +
          `${fmtPct(b.target_weight)} | ${fmtPp(b.drift_pp)} |`,
      );
    }
    lines.push('');
    lines.push(`</details>`);
  }

  return lines.join('\n') + '\n';
}

function prettySymbol(ticker: string): string {
  return ticker.match(/^([A-Z0-9]+?)[a-z]?_EQ$/)?.[1] ?? ticker;
}
