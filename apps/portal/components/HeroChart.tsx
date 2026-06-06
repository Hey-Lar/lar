'use client';

/**
 * BRIGHT-LINE: Read-only, display-only.
 * Hero candlestick + volume rendered from deterministic synthetic OHLCV via
 * TradingView Lightweight Charts (Apache-2.0). No live ticks, no orders.
 *
 * The chart is themed at mount from Lar's CSS vars and re-themed when the
 * `[data-theme]` attribute on <html> flips (D1's tri-theme toggle). The
 * charting library is dynamic-imported so it doesn't block the initial
 * portal bundle.
 */

import { useEffect, useId, useMemo, useRef } from 'react';
import { generateBars, type Bar } from '../lib/synthetic-ohlc';

// `lightweight-charts` ships rich generic types; we lean on `any` at the SDK
// boundary so the dynamic import keeps the type tree out of the eager bundle.
type ChartApi = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type SeriesApi = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface HeroChartProps {
  symbol: string;
  asOfMs: number;
  height?: number;
}

const HISTORY_BARS = 180;

interface ThemeColors {
  bg: string;
  text: string;
  grid: string;
  up: string;
  down: string;
  hearth: string;
  volume: string;
}

function readThemeColors(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const ink = v('--ink', '#26303c');
  const inkFaint = v('--ink-faint', '#8b96a4');
  const body = v('--body', '#eef1f6');
  return {
    bg: body,
    text: ink,
    grid: inkFaint,
    up: v('--pos', '#3aa6a0'),
    down: v('--neg', '#d2554d'),
    hearth: v('--hearth', '#d98a2b'),
    volume: v('--hearth-lo', '#f0b357'),
  };
}

export function HeroChart({ symbol, asOfMs, height = 360 }: HeroChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartApi | null>(null);
  const priceSeriesRef = useRef<SeriesApi | null>(null);
  const volumeSeriesRef = useRef<SeriesApi | null>(null);
  const labelId = useId();

  const bars: Bar[] = useMemo(
    () => generateBars(symbol, { asOfMs, count: HISTORY_BARS }),
    [symbol, asOfMs],
  );
  // Latest bars in a ref so the async mount-effect can read them without
  // re-creating the chart when `bars` updates (the bars-effect below pushes
  // new data into the existing series instead).
  const barsRef = useRef<Bar[]>(bars);
  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);

  // Mount once. Series data + theme are reactive via separate effects below.
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let resizeRaf = 0;
    let resizeObserver: ResizeObserver | null = null;
    let localChart: ChartApi | null = null;

    (async () => {
      const lwc = await import('lightweight-charts');
      if (disposed || !containerRef.current) return;
      const colors = readThemeColors();

      const chart = lwc.createChart(containerRef.current, {
        height,
        layout: {
          background: { color: 'transparent' },
          textColor: colors.text,
          fontFamily: '"Manrope", system-ui, sans-serif',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: `${colors.grid}33` },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, secondsVisible: false, fixLeftEdge: true },
        crosshair: {
          mode: lwc.CrosshairMode.Magnet,
          vertLine: { color: `${colors.grid}55`, labelBackgroundColor: colors.hearth },
          horzLine: { color: 'transparent', labelBackgroundColor: colors.hearth },
        },
        handleScale: { mouseWheel: false },
      });
      localChart = chart;
      chartRef.current = chart;

      // Cast each new series to the loose SDK alias so we keep the dynamic-
      // import boundary clean and don't drag the SDK's `Time` brand into our
      // local Bar mappers.
      const price: SeriesApi = chart.addCandlestickSeries({
        upColor: colors.up,
        downColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
        borderUpColor: colors.up,
        borderDownColor: colors.down,
        priceLineVisible: true,
        priceLineColor: colors.hearth,
        priceLineWidth: 1,
      });
      const volume: SeriesApi = chart.addHistogramSeries({
        priceScaleId: 'vol',
        priceFormat: { type: 'volume' },
        color: `${colors.volume}66`,
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      priceSeriesRef.current = price;
      volumeSeriesRef.current = volume;

      // Seed the series IMMEDIATELY — the bars-effect below already ran with
      // null refs and bailed; we must push initial data here or the chart
      // renders empty until the user picks a different symbol.
      const initial = barsRef.current;
      price.setData(
        initial.map((b) => ({
          time: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
      volume.setData(
        initial.map((b) => ({
          time: b.time,
          value: b.volume,
          color: `${b.close >= b.open ? colors.up : colors.down}66`,
        })),
      );
      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver((entries) => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          const entry = entries[0];
          if (!entry) return;
          chart.applyOptions({ width: entry.contentRect.width });
        });
      });
      resizeObserver.observe(containerRef.current);
    })();

    return () => {
      disposed = true;
      if (resizeObserver) resizeObserver.disconnect();
      cancelAnimationFrame(resizeRaf);
      if (localChart) localChart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // Push bars whenever symbol/asOfMs changes.
  useEffect(() => {
    const price = priceSeriesRef.current;
    const volume = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!price || !volume || !chart) return;
    price.setData(
      bars.map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );
    volume.setData(
      bars.map((b) => {
        const colors = readThemeColors();
        const isUp = b.close >= b.open;
        return {
          time: b.time,
          value: b.volume,
          color: `${isUp ? colors.up : colors.down}66`,
        };
      }),
    );
    chart.timeScale().fitContent();
  }, [bars]);

  // Re-apply palette when the user cycles themes (D1's [data-theme] flip).
  useEffect(() => {
    const root = document.documentElement;
    const applyPalette = () => {
      const chart = chartRef.current;
      const price = priceSeriesRef.current;
      const volume = volumeSeriesRef.current;
      if (!chart || !price || !volume) return;
      const c = readThemeColors();
      chart.applyOptions({
        layout: { textColor: c.text },
        grid: { horzLines: { color: `${c.grid}33` } },
        crosshair: {
          vertLine: { color: `${c.grid}55`, labelBackgroundColor: c.hearth },
          horzLine: { labelBackgroundColor: c.hearth },
        },
      });
      price.applyOptions({
        upColor: c.up,
        downColor: c.down,
        wickUpColor: c.up,
        wickDownColor: c.down,
        borderUpColor: c.up,
        borderDownColor: c.down,
        priceLineColor: c.hearth,
      });
      volume.applyOptions({ color: `${c.volume}66` });
      volume.setData(
        bars.map((b) => ({
          time: b.time,
          value: b.volume,
          color: `${b.close >= b.open ? c.up : c.down}66`,
        })),
      );
    };
    const observer = new MutationObserver(applyPalette);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [bars]);

  const last = bars.at(-1);
  const first = bars[0];
  const span = last && first ? last.close - first.close : 0;
  const spanPct = first && first.close > 0 ? span / first.close : 0;
  const sign: 'up' | 'down' | 'flat' = span > 0 ? 'up' : span < 0 ? 'down' : 'flat';
  const signColor =
    sign === 'up' ? 'var(--pos)' : sign === 'down' ? 'var(--neg)' : 'var(--ink-soft)';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="eyebrow">Hero chart · synthetic series · read-only</div>
          <div
            id={labelId}
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            {symbol}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 26,
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--ink)',
            }}
          >
            {last ? last.close.toFixed(2) : '—'}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: signColor }}>
            {sign === 'up' ? '+' : sign === 'down' ? '−' : ''}
            {span ? Math.abs(span).toFixed(2) : '0.00'}
            <span style={{ color: 'var(--ink-faint)', fontWeight: 600, marginLeft: 6 }}>
              over {bars.length} days · {(spanPct * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{ width: '100%', height }}
        role="img"
        aria-labelledby={labelId}
        aria-label={`${symbol} hero candlestick chart, ${bars.length} daily bars`}
      />
      <div className="note" style={{ marginTop: 10 }}>
        Synthetic data · not advice · Lar never trades.
      </div>
    </div>
  );
}
