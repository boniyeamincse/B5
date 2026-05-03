import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-400 uppercase tracking-widest"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              // base
              "w-full appearance-none rounded-xl border bg-[#0f172a] px-4 py-2.5 pr-10 text-sm text-white",
              "transition-all duration-150 outline-none cursor-pointer",
              // border & focus
              "border-white/10 focus:border-[#00ffff]/40 focus:ring-2 focus:ring-[#00ffff]/10",
              // error
              error && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/10",
              // disabled
              "disabled:cursor-not-allowed disabled:opacity-50",
              // placeholder (empty value)
              props.value === "" || props.value === undefined ? "text-slate-600" : "text-white",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#0f172a] text-white"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-xs text-red-400 font-medium">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
