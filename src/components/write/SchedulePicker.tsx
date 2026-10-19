"use client";

import { useId } from "react";
import { t } from "@/content";

/** "Open on a date" (time capsule): returns an ISO time at 06:00 UTC on the chosen day, or null. */
export function scheduleToIso(date: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T06:00:00.000Z` : null;
}

export function SchedulePicker({ value, onChange, minDate }: { value: string | null; onChange: (date: string | null) => void; minDate: string }) {
  const id = useId();
  return (
    <div className="rounded-2xl border border-line p-4">
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" checked={value !== null} onChange={(e) => onChange(e.target.checked ? minDate : null)} className="h-5 w-5 accent-[var(--c-cherry)]" />
        {t.schedule.label}
      </label>
      {value !== null && (
        <div className="mt-3">
          <label htmlFor={id} className="block text-sm font-medium">{t.schedule.dateLabel}</label>
          <input
            id={id}
            type="date"
            value={value}
            min={minDate}
            max="2100-12-31"
            onChange={(e) => onChange(e.target.value || minDate)}
            className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25"
          />
          <p className="mt-2 text-[13px] text-muted">{t.schedule.hint}</p>
        </div>
      )}
    </div>
  );
}
