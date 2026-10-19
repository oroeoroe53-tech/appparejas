import { cn } from "@/lib/utils";

export function FormMessage({ error, notice, className }: { error?: string; notice?: string; className?: string }) {
  if (!error && !notice) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn("rounded-2xl px-4 py-3 text-sm", error ? "bg-rose-soft text-cherry-deep" : "bg-paper text-ink shadow-soft", className)}
    >
      {error ?? notice}
    </p>
  );
}
