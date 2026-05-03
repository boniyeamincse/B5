"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttackBarDataPoint {
  label: string;
  value: number;
  /** Optional per-bar color override — defaults to the `defaultColor` prop */
  color?: string;
}

export interface AttackBarChartProps {
  data: AttackBarDataPoint[];
  /** Fallback bar colour when `data[n].color` is absent — defaults to Electric Cyan */
  defaultColor?: string;
  /** Chart height in px — defaults to 280 */
  height?: number;
  /** Unit appended to tooltip values, e.g. " req/s" */
  valueUnit?: string;
  /** Optional card title */
  title?: string;
  /** Optional right-side subtitle */
  subtitle?: string;
  /** Hide the glass card wrapper — render chart only */
  bare?: boolean;
  className?: string;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  payload?: AttackBarDataPoint;
  value?: number;
  color?: string;
  name?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueUnit?: string;
}

function CustomTooltip({ active, payload, label, valueUnit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a]/95 px-4 py-3 shadow-xl backdrop-blur-sm text-xs">
      <p className="font-bold text-slate-300 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color ?? "#00ffff" }} />
        <span className="text-white font-bold">
          {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          {valueUnit}
        </span>
      </div>
    </div>
  );
}

// ─── Custom Y-axis tick (full label, no truncation) ───────────────────────────

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

function CustomYTick({ x = 0, y = 0, payload }: TickProps) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill="#64748b"
      fontSize={11}
      fontWeight={700}
    >
      {payload?.value}
    </text>
  );
}

// ─── AttackBarChart ───────────────────────────────────────────────────────────

export function AttackBarChart({
  data,
  defaultColor = "#00ffff",
  height = 280,
  valueUnit = "",
  title,
  subtitle,
  bare = false,
  className,
}: AttackBarChartProps) {
  // Longest label length → dynamic left margin for Y-axis
  const maxLabelLen = Math.max(...data.map((d) => d.label.length));
  const leftMargin = Math.min(maxLabelLen * 7, 140);

  const chart = (
    <div>
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-base font-bold text-white">{title}</h3>}
          {subtitle && <span className="text-xs text-slate-500 font-medium">{subtitle}</span>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: leftMargin }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v)
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={<CustomYTick />}
            axisLine={false}
            tickLine={false}
            width={leftMargin}
          />
          <Tooltip
            content={<CustomTooltip valueUnit={valueUnit} />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color ?? defaultColor}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (bare) return chart;

  return (
    <div className={cn("glass rounded-2xl p-6 border border-white/5", className)}>
      {chart}
    </div>
  );
}
