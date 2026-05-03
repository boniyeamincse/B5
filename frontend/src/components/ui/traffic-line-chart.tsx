"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrafficDataPoint {
  /** X-axis label — e.g. "14:00", "Mon", "Jan 1" */
  label: string;
  [seriesKey: string]: string | number;
}

export interface TrafficSeries {
  key: string;
  label: string;
  color: string;
  /** Make the line dashed */
  dashed?: boolean;
}

export interface TrafficLineChartProps {
  data: TrafficDataPoint[];
  series: TrafficSeries[];
  /** Chart height in px — defaults to 240 */
  height?: number;
  /** Show the legend below the chart */
  showLegend?: boolean;
  /** Y-axis unit appended to tick labels, e.g. "/s" */
  yUnit?: string;
  /** Optional title rendered above the chart */
  title?: string;
  /** Optional right-aligned subtitle/badge */
  subtitle?: string;
  className?: string;
  /** Hide the glass card wrapper — render chart only */
  bare?: boolean;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey?: string | number;
  color?: string;
  name?: string | number;
  value?: string | number | (string | number)[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  yUnit?: string;
}

function CustomTooltip({ active, payload, label, yUnit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a]/95 px-4 py-3 shadow-xl backdrop-blur-sm text-xs">
      <p className="font-bold text-slate-400 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-bold text-white">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : String(entry.value ?? "")}
            {yUnit}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Custom legend ────────────────────────────────────────────────────────────

function CustomLegend({ series }: { series: TrafficSeries[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
      {series.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-6 h-0.5 rounded-full"
            style={{
              background: s.color,
              borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
            }}
          />
          <span className="text-xs text-slate-500 font-medium">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── TrafficLineChart ─────────────────────────────────────────────────────────

export function TrafficLineChart({
  data,
  series,
  height = 240,
  showLegend = true,
  yUnit = "",
  title,
  subtitle,
  className,
  bare = false,
}: TrafficLineChartProps) {
  const chart = (
    <div>
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-base font-bold text-white">{title}</h3>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500 font-medium">{subtitle}</span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k${yUnit}` : `${v}${yUnit}`
            }
          />
          <Tooltip
            content={<CustomTooltip yUnit={yUnit} />}
            cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: s.color }}
              strokeDasharray={s.dashed ? "5 3" : undefined}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {showLegend && series.length > 1 && <CustomLegend series={series} />}
    </div>
  );

  if (bare) return chart;

  return (
    <div className={cn("glass rounded-2xl p-6 border border-white/5", className)}>
      {chart}
    </div>
  );
}
