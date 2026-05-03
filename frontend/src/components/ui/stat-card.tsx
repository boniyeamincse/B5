import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  /** e.g. "+5.2%" or "Stable" */
  trend?: string;
  /** Positive = green arrow up, negative = red arrow down, null/undefined = no arrow */
  trendDirection?: "up" | "down" | "neutral";
  icon: React.ElementType;
  /** Tailwind text color for the icon, e.g. "text-blue-400" */
  iconColor?: string;
  /** Tailwind bg color for the icon wrapper, e.g. "bg-blue-500/10" */
  iconBg?: string;
  /** Optional subtitle below the value */
  subtitle?: string;
  /** Optional click handler */
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  trend,
  trendDirection,
  icon: Icon,
  iconColor = "text-[#00ffff]",
  iconBg = "bg-[#00ffff]/10",
  subtitle,
  onClick,
  className,
}: StatCardProps) {
  const trendEl = trend ? (
    trendDirection === "up" ? (
      <span className="flex items-center gap-1 text-xs font-bold text-green-400">
        <ArrowUpRight className="w-3 h-3" />
        {trend}
      </span>
    ) : trendDirection === "down" ? (
      <span className="flex items-center gap-1 text-xs font-bold text-red-400">
        <ArrowDownRight className="w-3 h-3" />
        {trend}
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
        <Minus className="w-3 h-3" />
        {trend}
      </span>
    )
  ) : null;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      onClick={onClick}
      className={cn(
        "glass rounded-2xl p-6 border border-white/5 transition-all",
        onClick && "cursor-pointer hover:border-white/10 hover:bg-white/[0.02] active:scale-[0.99]",
        className
      )}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl shrink-0", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {trendEl}
      </div>

      {/* Label */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>

      {/* Value */}
      <p className="text-3xl font-black text-white leading-none">{value}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-2 text-xs text-slate-600">{subtitle}</p>
      )}
    </div>
  );
}
