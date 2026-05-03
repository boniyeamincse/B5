import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Show a character counter when maxLength is set */
  showCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, showCount, maxLength, id, value, defaultValue, onChange, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const [count, setCount] = React.useState<number>(() => {
      if (value !== undefined) return String(value).length;
      if (defaultValue !== undefined) return String(defaultValue).length;
      return 0;
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full space-y-1.5">
        {(label || (showCount && maxLength)) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={textareaId}
                className="block text-xs font-bold text-slate-400 uppercase tracking-widest"
              >
                {label}
              </label>
            )}
            {showCount && maxLength && (
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums",
                  count > maxLength * 0.9 ? "text-red-400" : "text-slate-600"
                )}
              >
                {count}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            // base
            "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600",
            "resize-y min-h-[100px] transition-all duration-150 outline-none",
            // border & focus
            "border-white/10 focus:border-[#00ffff]/40 focus:ring-2 focus:ring-[#00ffff]/10",
            // error
            error && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/10",
            // disabled
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-red-400 font-medium">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
