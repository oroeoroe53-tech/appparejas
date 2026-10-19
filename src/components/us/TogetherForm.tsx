"use client";

import { useState, useTransition } from "react";
import { setTogetherSinceAction } from "@/app/actions/us";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { t } from "@/content";

export function TogetherForm({ initial, today }: { initial: string | null; today: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [result, setResult] = useState<{ error?: string; notice?: string }>();
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setTogetherSinceAction(value || null);
          setResult(res.ok ? { notice: t.us.togetherSaved } : { error: res.error });
        });
      }}
      className="space-y-3"
    >
      <label htmlFor="together" className="block text-sm font-medium">{t.us.togetherTitle}</label>
      <div className="flex gap-2">
        <input
          id="together"
          type="date"
          value={value}
          min="1950-01-01"
          max={today}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-paper px-4 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25"
        />
        <Button type="submit" variant="secondary" disabled={pending}>{t.us.togetherSave}</Button>
      </div>
      <p className="text-[13px] text-muted">{t.us.togetherHint}</p>
      <FormMessage error={result?.error} notice={result?.notice} />
    </form>
  );
}
