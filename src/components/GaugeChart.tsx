"use client";

import { useIsDarkMode } from "@/lib/useIsDarkMode";

const RADIUS = 80;
const CENTER = 100;
const TRACK_Y = 100;

/** Point on the gauge's semicircle for a given 0-100 percent (0 = left/0%, 100 = right/100%). */
function pointOnArc(percent: number, radius: number) {
  const angleDeg = 180 - (percent / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: TRACK_Y - radius * Math.sin(angleRad),
  };
}

/** A half-circle gauge (0-100%) with a needle -- e.g. win rate. Uses the SVG `pathLength` trick so the
 * filled arc's dash length can just be the percent itself, no arc-length math needed. */
export default function GaugeChart({ percent, label }: { percent: number; label?: string }) {
  const isDark = useIsDarkMode();
  const clamped = Math.max(0, Math.min(100, percent));
  const needleEnd = pointOnArc(clamped, RADIUS - 8);
  const arcPath = `M ${CENTER - RADIUS} ${TRACK_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${TRACK_Y}`;
  const accent = isDark ? "#9085e9" : "#4a3aa7";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[240px]">
        <path
          d={arcPath}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          pathLength={100}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={accent}
          strokeWidth={14}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${clamped} 100`}
        />
        <line
          x1={CENTER}
          y1={TRACK_Y}
          x2={needleEnd.x}
          y2={needleEnd.y}
          strokeWidth={3}
          strokeLinecap="round"
          className="stroke-slate-700 dark:stroke-slate-200"
        />
        <circle cx={CENTER} cy={TRACK_Y} r={5} className="fill-slate-700 dark:fill-slate-200" />
      </svg>
      <p className="-mt-4 text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
        {clamped}%
      </p>
      {label && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  );
}
