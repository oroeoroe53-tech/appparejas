/** Option catalogue for the character creator. Pure data: safe to import from client and server. */

const range = (n: number, prefix = "variant") => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);

export const CHARACTER_KEYS = [
  "head", "hair", "hairColor", "skinColor", "eyes", "eyebrows", "nose", "mouth",
  "glasses", "beard", "earrings", "freckles", "hairAccessories", "backgroundColor",
  "top", "topColor", "scarf", "scarfColor", "hat", "hatColor",
] as const;
export type CharacterKey = (typeof CHARACTER_KEYS)[number];
export type CharacterConfig = Record<CharacterKey, string>;

export const NONE = "none";

/** Variant lists. A test checks these against the underlying library's schema. */
export const VARIANTS = {
  head: range(4),
  hair: range(48),
  eyes: range(24),
  eyebrows: range(13),
  nose: range(6),
  mouth: [...range(18, "happy"), ...range(9, "sad")],
  glasses: range(5),
  beard: range(2),
  earrings: range(3),
  hairAccessories: ["flowers"],
  top: ["tee", "hoodie", "sweater"],
  scarf: ["plain", "striped"],
  hat: ["beanie", "pompom", "cap"],
} as const;

export const SKIN_COLORS = ["fbe3d3", "f5d0b5", "e9b78d", "d19a6b", "a8714a", "7a4a2e", "573621", "3b2415"];
export const HAIR_COLORS = ["1c1917", "3b2314", "6d4c41", "a0522d", "c68e4e", "e3c26b", "f5e1a4", "b5472f", "8a8a8a", "e8e8e8", "d96b9f", "4a6fd6"];
export const BACKGROUND_COLORS = ["fde2e4", "f9d5dc", "f3d9c6", "fbeed3", "dff0d8", "d9ecf2", "e8d9f1", "e5e0da"];

export const CLOTH_COLORS = ["e07a8c", "c94c4c", "f2a65a", "f4d35e", "8fbf7f", "4f9d8f", "6fa8dc", "3d5a9e", "9b7ed8", "d98fc0", "f5f0e8", "3b3b45"];

export const DEFAULT_CHARACTER: CharacterConfig = {
  head: "variant01",
  hair: "variant12",
  hairColor: "6d4c41",
  skinColor: "f5d0b5",
  eyes: "variant13",
  eyebrows: "variant05",
  nose: "variant01",
  mouth: "happy01",
  glasses: NONE,
  beard: NONE,
  earrings: NONE,
  freckles: NONE,
  hairAccessories: NONE,
  backgroundColor: "fde2e4",
  top: "tee",
  topColor: "e07a8c",
  scarf: NONE,
  scarfColor: "c94c4c",
  hat: NONE,
  hatColor: "3d5a9e",
};

const HEX = /^[0-9a-fA-F]{6}$/;
const COLOR_KEYS = new Set<CharacterKey>(["hairColor", "skinColor", "backgroundColor", "topColor", "scarfColor", "hatColor"]);
const OPTIONAL_KEYS = new Set<CharacterKey>(["glasses", "beard", "earrings", "freckles", "hairAccessories", "top", "scarf", "hat"]);

export function isValidValue(key: CharacterKey, value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (COLOR_KEYS.has(key)) return HEX.test(value);
  if (OPTIONAL_KEYS.has(key) && value === NONE) return true;
  if (key === "freckles") return value === "on";
  const list = (VARIANTS as Record<string, readonly string[]>)[key];
  return Boolean(list?.includes(value));
}

/** Keeps only valid values from untrusted input and fills the rest from defaults. */
export function sanitizeCharacter(raw: unknown): CharacterConfig {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_CHARACTER };
  for (const key of CHARACTER_KEYS) {
    const value = source[key];
    if (isValidValue(key, value)) out[key] = value;
  }
  return out;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

export function randomCharacter(): CharacterConfig {
  const maybe = (list: readonly string[], chance: number) => (Math.random() < chance ? pick(list) : NONE);
  return {
    head: pick(VARIANTS.head),
    hair: pick(VARIANTS.hair),
    hairColor: pick(HAIR_COLORS),
    skinColor: pick(SKIN_COLORS),
    eyes: pick(VARIANTS.eyes.filter((v) => v !== "variant19" && v !== "variant09")),
    eyebrows: pick(VARIANTS.eyebrows),
    nose: pick(VARIANTS.nose),
    mouth: pick(VARIANTS.mouth.filter((m) => m.startsWith("happy")).slice(0, 8)),
    glasses: maybe(VARIANTS.glasses, 0.25),
    beard: maybe(VARIANTS.beard, 0.2),
    earrings: maybe(VARIANTS.earrings, 0.25),
    freckles: Math.random() < 0.2 ? "on" : NONE,
    hairAccessories: NONE,
    backgroundColor: pick(BACKGROUND_COLORS),
    top: pick(VARIANTS.top),
    topColor: pick(CLOTH_COLORS),
    scarf: maybe(VARIANTS.scarf, 0.2),
    scarfColor: pick(CLOTH_COLORS),
    hat: maybe(VARIANTS.hat, 0.2),
    hatColor: pick(CLOTH_COLORS),
  };
}

export const MOODS = ["happy", "loved", "calm", "excited", "tired", "sad", "stressed"] as const;
export type Mood = (typeof MOODS)[number];
export const isMood = (v: unknown): v is Mood => typeof v === "string" && (MOODS as readonly string[]).includes(v);

export type Expression = "neutral" | "blink" | "joy" | Mood;
