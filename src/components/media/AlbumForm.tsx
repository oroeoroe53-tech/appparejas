"use client";

import { useActionState, useRef } from "react";
import { createAlbumAction } from "@/app/actions/media";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";

export function AlbumForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Parameters<typeof createAlbumAction>[0], fd: FormData) => {
    const res = await createAlbumAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft" noValidate>
      <h2 className="font-serif text-xl">{t.albums.create}</h2>
      <Field label={t.albums.titleLabel} name="title" maxLength={80} placeholder={t.albums.titlePlaceholder} required />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.albums.creating} className="w-full">{t.albums.createCta}</SubmitButton>
    </form>
  );
}
