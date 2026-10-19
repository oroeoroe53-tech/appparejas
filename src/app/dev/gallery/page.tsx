import { notFound } from "next/navigation";
import { SongPlayer } from "@/components/songs/SongPlayer";
import { MessageExperience } from "@/components/letters/MessageExperience";
import { MESSAGE_TYPES } from "@/lib/message-types";
import { t } from "@/content";

// Development-only visual gallery with clearly fake sample text, used to review the five experiences.
export default function Gallery() {
  if (process.env.NODE_ENV === "production") notFound();
  const sample = "SAMPLE TEXT — this is placeholder copy for visual review, not a real message.\n\nA second line, to see how paragraphs breathe, and how a longer sentence wraps across the page.";
  return (
    <main id="main" className="mx-auto max-w-md space-y-16 px-5 py-10">
      {MESSAGE_TYPES.map((type) => (
        <section key={type} data-type={type}>
          <h2 className="mb-4 text-xs tracking-widest text-muted uppercase">{t.types[type].name}</h2>
          <MessageExperience type={type} text={sample} senderName="Sample" dateLabel="Mon, 19 Oct · 09:41" hug={{ them: { top: "hoodie", topColor: "6fa8dc", hair: "variant30", hat: "pompom", hatColor: "d98fc0" }, me: { top: "sweater", topColor: "f2a65a", scarf: "striped", skinColor: "a8714a", backgroundColor: "d9ecf2" } }} />
        </section>
      ))}
      <section data-type="song">
        <h2 className="mb-4 text-xs tracking-widest text-muted uppercase">Song player (sample, not playable)</h2>
        <SongPlayer clip={{ trackId: "1", title: "SAMPLE song title", artist: "SAMPLE artist", previewUrl: "https://audio-ssl.itunes.apple.com/sample.m4a", artworkUrl: null, start: 8, duration: 15 }} />
      </section>
    </main>
  );
}
