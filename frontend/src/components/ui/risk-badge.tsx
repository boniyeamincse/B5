import React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type BadgeSize = "xs" | "sm" | "md";

export interface RiskBadgeProps {
  level: RiskLevel;
  /** Show a coloured dot before the label */
  dot?: boolean;
  /** Override displayed text — defaults to the level string */
  label?: string;
  size?: BadgeSize;
  className?: string;
}

// ─── Variant map ──────────────────────────────────────────────────────────────

const variants: Record<RiskLevel, string> = {
  CRITICAL: "text-red-400 bg-red-500/10 border-red-500/25",
  HIGH:     "text-orange-400 bg-orange-500/10 border-orange-500/25",
  MEDIUM:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
  LOW:      "text-blue-400 bg-blue-500/10 border-blue-500/25",
  NONE:     "text-slate-500 bg-slate-500/10 border-slate-500/25",
};

const dotColors: Record<RiskLevel, string> = {
  CRITICAL: "bg-red-400",
  HIGH:     "bg-orange-400",
  MEDIUM:   "bg-yellow-400",
  LOW:      "bg-blue-400",
  NONE:     "bg-slate-500",
};

const sizes: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[9px] gap-1",
  sm: "px-2 py-0.5 text-[10px] gap-1.5",
  md: "px-2.5 py-1 text-xs gap-2",
};

const dotSizes: Record<BadgeSize, string> = {
  xs: "w-1 h-1",
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

// ─── RiskBadge ────────────────────────────────────────────────────────────────

export function RiskBadge({
  level,
  dot = false,
  label,
  size = "sm",
  className,
}: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-md border tracking-wide uppercase",
        variants[level],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn("rounded-full shrink-0", dotColors[level], dotSizes[size])}
        />
      )}
      {label ?? level}
    </span>
  );
}

// ─── Convenience helper ───────────────────────────────────────────────────────

/** Map a numeric score (0–100) to a RiskLevel */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score > 0)   return "LOW";
  return "NONE";
}
