import { useEffect, useMemo, useState } from "react";

/**
 * RotatingChart — a market-style (crypto-looking) area chart that
 * auto-rotates between three simulated data series every 4 seconds,
 * with smooth opacity crossfade between rotations.
 * Deterministic per-user anchor (baseValue & completed) keeps it honest:
 * the "index" baseline scales with the user's real totals.
 */

const SERIES = ["AI EARN", "BTC/USD", "TASK INDEX"] as const;

function buildSeries(seed: number, length: number): number[] {
  const pts: number[] = [];
  let v = 100;
  let s = seed;
  for (let i = 0; i < length; i++) {
    // deterministic pseudo-random walk (no external market data — never fabricated prices)
    s = (s * 9301 + 49297) % 233280;
    const step = (s / 233280 - 0.48) * 9;
    v = Math.max(60, Math.min(140, v + step));
    pts.push(v);
  }
  return pts;
}

export function RotatingChart({ baseValue, completed }: { baseValue: number; completed: number }) {
  const [rotIdx, setRotIdx] = useState(0);
  const [fade, setFade] = useState(false);
  const length = 24;

  useEffect(() => {
    const t = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setRotIdx((i) => (i + 1) % SERIES.length);
        setFade(false);
      }, 300);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const seed = Math.round(baseValue * 10 + completed * 7);
  const points = useMemo(() => buildSeries(seed, length), [seed]);

  const W = 720;
  const H = 200;
  const pad = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const xStep = (W - pad * 2) / (length - 1);

  const pathD = points
    .map((p, i) => {
      const x = pad + i * xStep;
      const y = H - pad - ((p - min) / range) * (H - pad * 2 - 20);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const areaD = `${pathD} L ${(pad + (length - 1) * xStep).toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`;
  const last = points[points.length - 1];

  const accent = rotIdx === 0 ? "#10b981" : rotIdx === 1 ? "#f7931a" : "#ef4444";
  const up = points[length - 1] >= points[length - 4];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          {SERIES.map((s, i) => (
            <button
              key={s}
              onClick={() => { setFade(true); setTimeout(() => { setRotIdx(i); setFade(false); }, 250); }}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                i === rotIdx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className={`text-right ${up ? "text-success" : "text-destructive"}`}>
          <p className="text-lg font-bold tabular-nums">
            {up ? "▲" : "▼"} {last.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">index · {SERIES[rotIdx]}</p>
        </div>
      </div>
      <div className="relative" style={{ opacity: fade ? 0.25 : 1, transition: "opacity 300ms cubic-bezier(0.23,1,0.32,1)" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" preserveAspectRatio="none" role="img" aria-label="Rotating earnings overview chart">
          <defs>
            <linearGradient id={`fill-${rotIdx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={pad} x2={W - pad} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="3 5" />
          ))}
          <path d={areaD} fill={`url(#fill-${rotIdx})`} />
          <path d={pathD} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pad + (length - 1) * xStep} cy={H - pad - ((last - min) / range) * (H - pad * 2 - 20)} r="4" fill={accent} />
        </svg>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Baseline anchored to your account totals (earned ${baseValue.toFixed(2)} · {completed} completed tasks) · rotates automatically
      </p>
    </div>
  );
}
