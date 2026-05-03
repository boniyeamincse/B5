"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef<T> {
  /** Unique key — also used to access row[key] unless renderCell is provided */
  key: string;
  header: string;
  /** Override how the cell renders */
  renderCell?: (row: T) => React.ReactNode;
  /** Allow sorting on this column */
  sortable?: boolean;
  /** Extra className for the <td> */
  cellClassName?: string;
  /** Extra className for the <th> */
  headerClassName?: string;
  /** Hide column on small screens */
  hideOnMobile?: boolean;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  /** Render the action as danger (red) */
  danger?: boolean;
  /** Hide action based on row data */
  hidden?: (row: T) => boolean;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Key field used for React keys — defaults to "id" */
  rowKey?: keyof T;
  rowActions?: RowAction<T>[];
  /** Rows per page options */
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  /** Show a zebra-stripe effect */
  striped?: boolean;
  /** Show a loading skeleton overlay */
  loading?: boolean;
  /** Message when data is empty */
  emptyMessage?: string;
  /** Optional class for the outer wrapper */
  className?: string;
  /** Callback fired on sort change */
  onSortChange?: (key: string, direction: SortDirection) => void;
}

// ─── Sort icon helper ─────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <ChevronUp className="w-3 h-3 text-[#00ffff]" />;
  if (direction === "desc") return <ChevronDown className="w-3 h-3 text-[#00ffff]" />;
  return <ChevronsUpDown className="w-3 h-3 text-slate-600 group-hover/th:text-slate-400" />;
}

// ─── Row actions dropdown ─────────────────────────────────────────────────────

function ActionsMenu<T>({ actions, row }: { actions: RowAction<T>[]; row: T }) {
  const [open, setOpen] = useState(false);
  const visible = actions.filter((a) => !a.hidden?.(row));
  if (visible.length === 0) return null;

  return (
    <div className="relative flex justify-end">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl border border-white/10 bg-[#0f172a] shadow-xl py-1">
            {visible.map((action) => (
              <button
                key={action.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  action.onClick(row);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-left transition-colors",
                  action.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {action.icon && <span className="w-3.5 h-3.5">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRows({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-white/5">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="px-6 py-4">
              <div className="h-3 rounded-full bg-white/5 animate-pulse" style={{ width: `${55 + ((ri + ci) % 4) * 10}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey = "id" as keyof T,
  rowActions,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  striped = false,
  loading = false,
  emptyMessage = "No records found.",
  className,
  onSortChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // ── Sort ──
  const handleSort = useCallback(
    (key: string) => {
      setSortKey((prev) => {
        let nextDir: SortDirection;
        if (prev !== key) {
          nextDir = "asc";
        } else {
          nextDir = sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc";
        }
        setSortDir(nextDir);
        onSortChange?.(key, nextDir);
        return nextDir === null ? null : key;
      });
    },
    [sortDir, onSortChange]
  );

  // ── Client-side sort ──
  const sorted = useMemo(() => {
    if (!sortKey || sortDir === null) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const colCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div className={cn("glass rounded-2xl border border-white/5 overflow-hidden", className)}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "group/th px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest select-none",
                    col.sortable && "cursor-pointer hover:text-slate-300 transition-colors",
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
              {rowActions && rowActions.length > 0 && (
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-12" />
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {loading ? (
              <SkeletonRows cols={colCount} rows={pageSize > 5 ? 5 : pageSize} />
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-6 py-16 text-center text-sm text-slate-600 font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={String(row[rowKey] ?? ri)}
                  className={cn(
                    "transition-colors hover:bg-white/[0.02]",
                    striped && ri % 2 === 1 && "bg-white/[0.01]"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-6 py-4 text-sm text-slate-300",
                        col.hideOnMobile && "hidden sm:table-cell",
                        col.cellClassName
                      )}
                    >
                      {col.renderCell
                        ? col.renderCell(row)
                        : (row[col.key] as React.ReactNode) ?? "—"}
                    </td>
                  ))}
                  {rowActions && rowActions.length > 0 && (
                    <td className="px-4 py-4">
                      <ActionsMenu actions={rowActions} row={row} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/5">
        {/* Page size */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSize(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-slate-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#00ffff]/40 cursor-pointer"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s} className="bg-[#0f172a]">
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <span className="text-xs text-slate-600">
          {sorted.length === 0
            ? "0 records"
            : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
        </span>

        {/* Page controls */}
        <div className="flex items-center gap-1">
          {(
            [
              { icon: ChevronsLeft,  action: () => setPage(1),           disabled: safePage <= 1 },
              { icon: ChevronLeft,   action: () => setPage((p) => p - 1), disabled: safePage <= 1 },
              { icon: ChevronRight,  action: () => setPage((p) => p + 1), disabled: safePage >= totalPages },
              { icon: ChevronsRight, action: () => setPage(totalPages),   disabled: safePage >= totalPages },
            ] as const
          ).map(({ icon: Icon, action, disabled }, i) => (
            <button
              key={i}
              onClick={action}
              disabled={disabled}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
