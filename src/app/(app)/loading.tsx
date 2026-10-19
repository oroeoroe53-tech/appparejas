/** Shown instantly while a page's data loads, so every tap gets an immediate response. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse pt-8">
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-32 rounded-full bg-rose/40" />
      <div className="mt-4 h-9 w-3/4 rounded-xl bg-rose/30" />
      <div className="mt-8 h-56 rounded-[2rem] bg-paper shadow-soft" />
      <div className="mt-5 h-16 rounded-3xl bg-paper shadow-soft" />
      <div className="mt-4 h-24 rounded-3xl bg-paper shadow-soft" />
    </div>
  );
}
