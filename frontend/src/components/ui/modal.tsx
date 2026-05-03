"use client";

import React, { useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw]",
} as const;

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Width preset — defaults to "md" */
  size?: keyof typeof sizeMap;
  /** Prevent closing by clicking the backdrop */
  persistent?: boolean;
  /** Footer slot — pass null to hide the default footer area */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  persistent = false,
  footer,
  children,
  className,
}: ModalProps) {
  const titleId = useId();

  // Close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose();
    },
    [onClose, persistent]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  if (!open) return null;

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={persistent ? undefined : onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl border border-white/10",
          "bg-[#0f172a] shadow-2xl shadow-black/60",
          "flex flex-col max-h-[90vh]",
          "animate-in fade-in-0 zoom-in-95 duration-150",
          sizeMap[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
          <div>
            <h2
              id={titleId}
              className="text-lg font-black text-white tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {!persistent && (
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all -mr-1 -mt-1"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer !== null && footer !== undefined && (
          <div className="shrink-0 px-6 pb-6 pt-4 border-t border-white/5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

// ─── ModalFooter helper ───────────────────────────────────────────────────────

export interface ModalFooterProps {
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Render confirm button as destructive (red) */
  danger?: boolean;
}

export function ModalFooter({
  onClose,
  onConfirm,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  danger = false,
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            danger
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-[#00ffff] text-[#0f172a] hover:bg-[#00ffff]/80"
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving…
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      )}
    </div>
  );
}

// ─── ConfirmDialog — thin wrapper for destructive confirmations ───────────────

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  /** "danger" = red confirm button (default), "warning" = yellow */
  variant?: "danger" | "warning";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <ModalFooter
          onClose={onClose}
          onConfirm={onConfirm}
          confirmLabel={confirmLabel}
          loading={loading}
          danger={variant === "danger"}
        />
      }
    >
      <div className="flex flex-col items-center gap-4 text-center py-2">
        <div
          className={cn(
            "p-4 rounded-2xl",
            variant === "danger" ? "bg-red-500/10" : "bg-yellow-500/10"
          )}
        >
          {variant === "danger" ? (
            <Trash2 className="w-7 h-7 text-red-400" />
          ) : (
            <AlertTriangle className="w-7 h-7 text-yellow-400" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-1.5 text-sm text-slate-400">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
