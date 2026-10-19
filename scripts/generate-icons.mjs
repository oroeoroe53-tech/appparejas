// Generates the PWA icons from one geometric mark (two interlocking rings). Run: npm run icons
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const CHERRY = "#9D394D";
const CREAM = "#FAF7F2";
const ROSE = "#E9B8B8";

/** `scale` shrinks the mark inside the canvas (used for the maskable safe zone). */
function mark({ bg, scale = 1, ringA, ringB, rounded }) {
  const s = 512;
  const r = 118 * scale;
  const stroke = 30 * scale;
  const dx = 66 * scale;
  const bgRect = bg ? `<rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${bgRect}
  <circle cx="${256 - dx}" cy="256" r="${r}" fill="none" stroke="${ringA}" stroke-width="${stroke}"/>
  <circle cx="${256 + dx}" cy="256" r="${r}" fill="none" stroke="${ringB}" stroke-width="${stroke}"/>
</svg>`;
}

const out = async (name, svg, size) => {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(root, "icons", name));
  console.log("wrote", name);
};

await mkdir(join(root, "icons"), { recursive: true });
const standard = mark({ bg: CHERRY, ringA: CREAM, ringB: ROSE, rounded: true });
const fullBleed = mark({ bg: CHERRY, ringA: CREAM, ringB: ROSE, scale: 0.8 });
await out("icon-192.png", standard, 192);
await out("icon-512.png", standard, 512);
await out("icon-maskable-512.png", fullBleed, 512);
await out("apple-touch-icon.png", fullBleed, 180);
await out("badge-96.png", mark({ ringA: "#ffffff", ringB: "#ffffff" }), 96);
await writeFile(join(root, "icon.svg"), standard);
console.log("wrote icon.svg");
