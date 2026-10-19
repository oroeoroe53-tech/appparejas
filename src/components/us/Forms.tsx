"use client";

import { useActionState, useRef } from "react";
import { addEventAction, addStoryAction, answerQuestionAction } from "@/app/actions/shared";
import { StoryPhotoField } from "@/components/media/StoryPhotoField";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";

function TextArea({ name, label, placeholder, rows = 3, maxLength }: { name: string; label: string; placeholder?: string; rows?: number; maxLength: number }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">{label}</label>
      <textarea id={name} name={name} rows={rows} maxLength={maxLength} placeholder={placeholder} className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base placeholder:text-stone focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
    </div>
  );
}

export function EventForm({ today }: { today: string }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof addEventAction>[0], fd: FormData) => {
    const res = await addEventAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft" noValidate>
      <h2 className="font-serif text-xl">{t.plans.add}</h2>
      <Field label={t.plans.titleLabel} name="title" maxLength={80} placeholder={t.plans.titlePlaceholder} required />
      <Field label={t.plans.dateLabel} name="date" type="date" defaultValue={today} min="1950-01-01" max="2100-12-31" required />
      <div className="space-y-1.5">
        <label htmlFor="kind" className="block text-sm font-medium">{t.plans.kindLabel}</label>
        <select id="kind" name="kind" defaultValue="plan" className="min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25">
          {(["plan", "anniversary", "birthday"] as const).map((k) => (<option key={k} value={k}>{t.plans.kinds[k]}</option>))}
        </select>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="yearly" className="h-5 w-5 accent-[var(--c-cherry)]" /> {t.plans.yearly}
      </label>
      <TextArea name="note" label={t.plans.noteLabel} maxLength={300} rows={2} />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.plans.saving} className="w-full">{t.plans.saveCta}</SubmitButton>
    </form>
  );
}

export function StoryForm({ today, spaceId }: { today: string; spaceId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Parameters<typeof addStoryAction>[0], fd: FormData) => {
    const res = await addStoryAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft" noValidate>
      <h2 className="font-serif text-xl">{t.story.add}</h2>
      <Field label={t.story.titleLabel} name="title" maxLength={100} placeholder={t.story.titlePlaceholder} required />
      <Field label={t.story.dateLabel} name="date" type="date" defaultValue={today} min="1950-01-01" max={today} required />
      <TextArea name="note" label={t.story.noteLabel} maxLength={1000} rows={4} />
      <StoryPhotoField key={state?.notice ?? "idle"} spaceId={spaceId} />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.story.saving} className="w-full">{t.story.saveCta}</SubmitButton>
    </form>
  );
}

export function QuestionCard({
  question, partnerName, myAnswer, partnerAnswer, partnerAnswered,
}: {
  question: string;
  partnerName: string;
  myAnswer: string | null;
  partnerAnswer: string | null;
  partnerAnswered: boolean;
}) {
  const [state, action] = useActionState(answerQuestionAction, undefined);
  return (
    <section aria-label={t.question.title} className="rounded-3xl bg-paper p-5 shadow-soft">
      <p className="text-xs tracking-[0.2em] text-cherry uppercase">{t.question.title}</p>
      <h2 className="mt-2 font-serif text-[1.35rem] leading-snug">{question}</h2>
      {myAnswer === null ? (
        <form action={action} className="mt-4 space-y-3" noValidate>
          {partnerAnswered && <p className="rounded-2xl bg-rose-soft px-4 py-2.5 text-sm text-cherry-deep">{t.question.partnerAnswered(partnerName)}</p>}
          <TextArea name="answer" label={t.question.answerLabel} placeholder={t.question.answerPlaceholder} maxLength={500} rows={3} />
          <FormMessage error={state?.error} />
          <SubmitButton pendingLabel={t.question.submitting}>{t.question.submit}</SubmitButton>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-cream px-4 py-3">
            <p className="text-xs text-muted">{t.question.yourAnswer}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{myAnswer}</p>
          </div>
          {partnerAnswer !== null ? (
            <div className="rounded-2xl bg-rose-soft px-4 py-3">
              <p className="text-xs text-cherry-deep">{t.question.theirAnswer(partnerName)}</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{partnerAnswer}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">{t.question.waitingFor(partnerName)}</p>
          )}
        </div>
      )}
    </section>
  );
}
