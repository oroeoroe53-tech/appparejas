import { notFound } from "next/navigation";
import { MessageExperience } from "@/components/letters/MessageExperience";
import { MESSAGE_TYPES } from "@/lib/message-types";
import { t } from "@/content";

// Development-only visual gallery with clearly fake sample text, used to review the five experiences.
export default function Gallery() {
  if (process.env.NODE_ENV === "production") notFound();
  const sample = "SAMPLE TEXT — this is placeholder copy for visual review, not a real message.\n\nA second line, to see how paragraphs breathe.";
  return (
    <main id="main" className="mx-auto max-w-md space-y-16 px-5 py-10">
      {MESSAGE_TYPES.map((type) => (
        <section key={type} data-type={type}>
          <h2 className="mb-4 text-xs tracking-widest text-muted uppercase">{t.types[type].name}</h2>
          <MessageExperience type={type} text={sample} senderName="Sample" dateLabel="Mon, 19 Oct · 09:41" />
        </section>
      ))}
    </main>
  );
}
