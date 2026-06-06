'use client';

import { useId } from 'react';

interface SparklineProps {
  /** Series of closes; renders nothing useful below 2 points. */
  data: number[];
  /** Display width in CSS pixels (viewBox is fixed; SVG scales). */
  width?: number;
  /** Display height in CSS pixels. */
  height?: number;
  /** Force a sign; otherwise derived from first vs last. */
  sign?: 'up' | 'down' | 'flat';
}

/**
 * Tiny pure-SVG sparkline. Colors come from CSS vars so it follows the active
 * theme without re-rendering (`--pos` / `--neg` / `--ink-faint`).
 */
export function Sparkline({ data, width = 80, height = 22, sign }: SparklineProps) {
  const gradId = useId();
  if (data.length < 2) {
    return (
      <span aria-hidden style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
        —
      </span>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const lastIdx = points.length - 1;
  const fillPath = `${linePath} L${(points[lastIdx]?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;
  const direction: 'up' | 'down' | 'flat' = sign ?? deriveSign(data[0] ?? 0, data[lastIdx] ?? 0);
  const stroke =
    direction === 'up' ? 'var(--pos)' : direction === 'down' ? 'var(--neg)' : 'var(--ink-faint)';
  const [endX, endY] = points[lastIdx] ?? [0, 0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="round" />
      <circle cx={endX} cy={endY} r={1.75} fill={stroke} />
    </svg>
  );
}

function deriveSign(first: number, last: number): 'up' | 'down' | 'flat' {
  if (last > first) return 'up';
  if (last < first) return 'down';
  return 'flat';
}
