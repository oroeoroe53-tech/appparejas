import type { Metadata } from "next";
import Link from "next/link";
import { deleteDreamAction } from "@/app/actions/love";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { DreamCheck, DreamForm } from "@/components/us/LoveForms";
import { t } from "@/content";
import { formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getDreams } from "@/server/queries";

export const metadata: Metadata = { title: "Dreams" };
export const dynamic = "force-dynamic";

export default async function DreamsPage() {
  const [ctx, dreams] = await Promise.all([requireSpace(), getDreams()]);
  const todo = dreams.filter((d) => !d.done);
  const done = dreams.filter((d) => d.done);
  const row = (d: (typeof dreams)[number]) => (
    <li key={d.id} className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3.5 shadow-soft">
      <DreamCheck id={d.id} title={d.title} done={d.done} />
      <div className="min-w-0 flex-1">
        <p className={d.done ? "text-[15px] text-muted line-through decoration-rose" : "text-[15px] font-medium"}>{d.title}</p>
        {d.note && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted">{d.note}</p>}
        {d.done && d.done_at ? (
          <p className="mt-1 text-xs text-cherry">{t.dreams.doneOn(formatDay(d.done_at))}</p>
        ) : (
          d.target_date && <p className="mt-1 text-xs text-muted">{formatDay(d.target_date)}</p>
        )}
      </div>
      {d.created_by === ctx.user.id && <DeleteButton action={deleteDreamAction} id={d.id} label={t.dreams.remove} confirmLabel={t.dreams.removeConfirm} />}
    </li>
  );
  return (
    <>
      <PageHeader title={t.dreams.title} subtitle={t.dreams.subtitle} />
      <DreamForm />
      <section className="mt-10" aria-labelledby="todo">
        <h2 id="todo" className="mb-3 font-serif text-xl">{t.dreams.todo}</h2>
        {todo.length === 0 ? <p className="text-[15px] text-muted">{t.dreams.emptyTodo}</p> : <ul className="space-y-3">{todo.map(row)}</ul>}
      </section>
      <section className="mt-10" aria-labelledby="done">
        <h2 id="done" className="mb-3 font-serif text-xl">{t.dreams.done}</h2>
        {done.length === 0 ? <p className="text-[15px] text-muted">{t.dreams.emptyDone}</p> : <ul className="space-y-3">{done.map(row)}</ul>}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
