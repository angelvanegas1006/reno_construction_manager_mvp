"use client";

import { useMemo } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 28,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = useMemo(() => segments.reduce((s, seg) => s + seg.value, 0), [segments]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const arcs = useMemo(() => {
    if (total === 0) return [];
    let offset = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((seg) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const rotation = offset * 360 - 90;
        offset += pct;
        return { ...seg, dash, gap, rotation };
      });
  }, [segments, total, circumference]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted"
              strokeWidth={strokeWidth}
            />
          ) : (
            arcs.map((arc, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                transform={`rotate(${arc.rotation} ${cx} ${cy})`}
                className="transition-all duration-500"
              />
            ))
          )}
        </svg>
        {(centerLabel || centerValue != null) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue != null && (
              <span className="text-2xl font-bold text-foreground leading-none">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-muted-foreground">{seg.label}</span>
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {seg.value}
            </span>
            {total > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({Math.round((seg.value / total) * 100)}%)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
