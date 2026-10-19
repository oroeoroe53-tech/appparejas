import { useId } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; ref?: React.Ref<HTMLInputElement> }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        className="min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink placeholder:text-stone transition focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25"
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[13px] text-cherry">
          {error}
        </p>
      )}
    </div>
  );
}
