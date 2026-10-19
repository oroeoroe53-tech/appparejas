import { notFound } from "next/navigation";
import { Book, type BookData } from "@/components/book/Book";
import { renderStill } from "@/lib/character";

// Development-only preview of the keepsake with clearly fake sample content.
const photo = (hue: number) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${hue} 60% 85%)"/><circle cx="50" cy="42" r="18" fill="hsl(${hue} 60% 65%)"/><rect x="20" y="66" width="60" height="22" rx="10" fill="hsl(${hue} 60% 70%)"/></svg>`)}`;

export default function DevBook() {
  if (process.env.NODE_ENV === "production") notFound();
  const data: BookData = {
    names: { me: "Sample", them: "Example" },
    since: "2024-02-14",
    sinceLabel: "14 feb 2024",
    days: 614,
    figures: {
      me: renderStill({ top: "sweater", topColor: "f2a65a", scarf: "striped", skinColor: "a8714a", backgroundColor: "d9ecf2" }).neutral,
      them: renderStill({ top: "hoodie", topColor: "6fa8dc", hair: "variant30", hat: "pompom", hatColor: "d98fc0" }).neutral,
    },
    story: [
      { id: "1", title: "SAMPLE: the day we met", note: "Placeholder text for a visual review.", dateLabel: "14 feb 2024", photoUrl: photo(340) },
      { id: "2", title: "SAMPLE: our first trip", note: null, dateLabel: "2 jun 2024", photoUrl: null },
      { id: "3", title: "SAMPLE: moving in together", note: "A longer placeholder note, to see how paragraphs wrap inside the little card.", dateLabel: "1 sep 2025", photoUrl: null },
    ],
    photos: [0, 1, 2].map((i) => ({ id: `p${i}`, url: photo(i * 90 + 20), caption: i === 1 ? "" : `SAMPLE caption ${i + 1}`, dateLabel: "3 mar 2025" })),
    letters: [{ id: "l1", from: "Sample", style: "love_letter", text: "SAMPLE LETTER — placeholder text.\n\nA second paragraph, to see how the handwriting looks across several lines of a letter.", dateLabel: "14 feb 2025" }],
    reasons: Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, text: `SAMPLE reason number ${i + 1}`, by: i % 2 ? "Sample" : "Example" })),
    questions: [{ day: "2026-01-02", question: "SAMPLE: what makes you laugh the hardest?", answers: [{ name: "Sample", text: "Placeholder answer one." }, { name: "Example", text: "Placeholder answer two." }] }],
    songs: [{ id: "s1", title: "SAMPLE song", artist: "SAMPLE artist", art: null, note: "our song", by: "Sample" }],
    dreams: [{ id: "d1", title: "SAMPLE: see the northern lights", note: null, doneLabel: "20 dic 2025" }],
  };
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Book data={data} />
    </main>
  );
}
