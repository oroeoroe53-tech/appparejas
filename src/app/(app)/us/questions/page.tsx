import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuestionCard } from "@/components/us/Forms";
import { questionForDay } from "@/content/questions";
import { t } from "@/content";
import { toDayNumber, todayIso } from "@/lib/dates";
import { formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getAnswers, partnerAnswered, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Daily question" };
export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const today = todayIso(new Date());
  const [ctx, answers, theyAnswered] = await Promise.all([requireSpace(), getAnswers(), partnerAnswered(today)]);
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const mine = answers.find((a) => a.day === today && a.user_id === ctx.user.id)?.answer ?? null;
  const theirs = answers.find((a) => a.day === today && a.user_id !== ctx.user.id)?.answer ?? null;

  const days = [...new Set(answers.filter((a) => a.day !== today).map((a) => a.day))];
  return (
    <>
      <PageHeader title={t.question.title} />
      <QuestionCard question={questionForDay(toDayNumber(today))} partnerName={partnerName} myAnswer={mine} partnerAnswer={theirs} partnerAnswered={theyAnswered} />
      <section className="mt-10" aria-labelledby="hist">
        <h2 id="hist" className="mb-4 font-serif text-xl">{t.question.history}</h2>
        {days.length === 0 ? (
          <p className="text-[15px] text-muted">{t.question.historyEmpty}</p>
        ) : (
          <ul className="space-y-4">
            {days.map((day) => {
              const my = answers.find((a) => a.day === day && a.user_id === ctx.user.id);
              const their = answers.find((a) => a.day === day && a.user_id !== ctx.user.id);
              return (
                <li key={day} className="rounded-2xl border border-line p-4">
                  <p className="text-xs text-muted">{formatDay(day)}</p>
                  <p className="mt-1 font-serif text-lg leading-snug">{questionForDay(toDayNumber(day))}</p>
                  {my && <p className="mt-3 text-sm"><span className="text-muted">{t.question.yourAnswer}: </span>{my.answer}</p>}
                  {their && <p className="mt-2 text-sm"><span className="text-muted">{t.question.theirAnswer(partnerName)}: </span>{their.answer}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
