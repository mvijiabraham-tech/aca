import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, required, hint, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-2xs uppercase tracking-wider font-semibold text-navy-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      </div>
      {children}
      {hint && !error && <div className="text-2xs text-ink-500 mt-1 leading-relaxed">{hint}</div>}
      {error && <div className="text-2xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

const inputClasses = "w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors placeholder:text-ink-400 disabled:bg-ink-100 disabled:cursor-not-allowed";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input type="text" className={cn(inputClasses, className)} {...rest} />;
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input type="number" className={cn(inputClasses, className)} {...rest} />;
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input type="date" className={cn(inputClasses, className)} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={cn(inputClasses, "resize-y min-h-[80px]", className)} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select className={cn(inputClasses, "cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

// Radio group — used for purpose, mode, etc.
interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface RadioGroupProps<T extends string> {
  value: T | undefined;
  onChange: (v: T) => void;
  options: RadioOption<T>[];
  layout?: "row" | "column";
}

export function RadioGroup<T extends string>({ value, onChange, options, layout = "row" }: RadioGroupProps<T>) {
  return (
    <div className={cn("gap-2", layout === "row" ? "grid grid-cols-2 md:grid-cols-4" : "flex flex-col")}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "text-left px-3 py-2.5 rounded-md border-2 transition-all",
              isSelected
                ? "border-ocean-500 bg-ocean-50/40"
                : "border-ink-200 bg-white hover:border-ink-300",
            )}
          >
            <div className={cn(
              "text-sm font-medium",
              isSelected ? "text-navy-700" : "text-ink-700",
            )}>
              {opt.label}
            </div>
            {opt.description && (
              <div className="text-2xs text-ink-500 mt-0.5 leading-snug">{opt.description}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Checkbox
interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: string;
}

export function Checkbox({ checked, onChange, label, description }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={cn(
          "w-4 h-4 rounded border-2 transition-colors",
          checked ? "bg-ocean-600 border-ocean-600" : "bg-white border-ink-300 group-hover:border-ink-400",
        )} />
        {checked && (
          <svg className="absolute top-0 left-0 w-4 h-4 text-white pointer-events-none" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-ink-700 leading-tight">{label}</div>
        {description && <div className="text-2xs text-ink-500 mt-0.5 leading-relaxed">{description}</div>}
      </div>
    </label>
  );
}
