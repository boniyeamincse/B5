"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutSlice[];
  /** Chart diameter in px — defaults to 220 */
  size?: number;
  /** Show the legend list below the chart */
  showLegend?: boolean;
  /** Central label line 1 — e.g. total count */
  centerLabel?: string;
  /** Central label line 2 — e.g. "Events" */
  centerSublabel?: string;
  /** Optional card title */
  title?: string;
  /** Optional right-side subtitle */
  subtitle?: string;
  /** Hide the glass card wrapper */
  bare?: boolean;
  className?: string;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  payload?: DonutSlice;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0].payload;
  if (!slice) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a]/95 px-4 py-3 shadow-xl backdrop-blur-sm text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: slice.color }} />
        <span className="font-bold text-slate-300">{slice.label}</span>
      </div>
      <p className="text-white font-bold text-sm">{slice.value.toLocaleString()}</p>
    </div>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  size = 220,
  showLegend = true,
  centerLabel,
  centerSublabel,
  title,
  subtitle,
  bare = false,
  className,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const innerRadius = size * 0.28;
  const outerRadius = size * 0.42;

  const chart = (
    <div>
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-base font-bold text-white">{title}</h3>}
          {subtitle && <span className="text-xs text-slate-500 font-medium">{subtitle}</span>}
        </div>
      )}

      <div className="flex flex-col items-center">
        <div style={{ width: size, height: size }} className="relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                dataKey="value"
                nameKey="label"
                strokeWidth={0}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.4}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text overlay */}
          {(centerLabel || centerSublabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerLabel && (
                <span className="text-xl font-black text-white leading-none">{centerLabel}</span>
              )}
              {centerSublabel && (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {centerSublabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="w-full mt-4 space-y-2">
            {data.map((entry, index) => {
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
              return (
                <div
                  key={entry.label}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-default",
                    activeIndex === index ? "bg-white/5" : "hover:bg-white/3"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: entry.color }}
                  />
                  <span className="text-xs text-slate-300 font-medium flex-1 truncate">
                    {entry.label}
                  </span>
                  <span className="text-xs text-slate-500 font-mono shrink-0">
                    {entry.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold w-10 text-right shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (bare) return chart;

  return (
    <div className={cn("glass rounded-2xl p-6 border border-white/5", className)}>
      {chart}
    </div>
  );
}
