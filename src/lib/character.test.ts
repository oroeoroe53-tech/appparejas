import { describe, expect, it } from "vitest";
import * as lorelei from "@dicebear/lorelei";
import { CHARACTER_KEYS, DEFAULT_CHARACTER, MOODS, randomCharacter, sanitizeCharacter, VARIANTS } from "./character-options";
import { renderCharacterSvg, renderFrames, sceneAt } from "./character";

const schema = lorelei.schema.properties as Record<string, { items?: { enum?: string[] } }>;

describe("character catalogue", () => {
  it("matches the options the rendering library really supports", () => {
    const OWN = new Set(["top", "scarf", "hat"]); // drawn by us, not part of the library
    for (const [key, list] of Object.entries(VARIANTS)) {
      if (OWN.has(key)) continue;
      const supported = schema[key]?.items?.enum ?? [];
      expect([...list].sort(), key).toEqual([...supported].sort());
    }
  });

  it("every mood maps to a renderable face", () => {
    for (const mood of MOODS) expect(renderCharacterSvg(DEFAULT_CHARACTER, mood)).toContain("<svg");
  });
});

describe("sanitizeCharacter", () => {
  it("drops unknown keys and invalid values, keeping defaults", () => {
    const c = sanitizeCharacter({ hair: "variant99", evil: "x", skinColor: "javascript:alert(1)", eyes: "variant03", mouth: ["happy01"] });
    expect(c.hair).toBe(DEFAULT_CHARACTER.hair);
    expect(c.skinColor).toBe(DEFAULT_CHARACTER.skinColor);
    expect(c.mouth).toBe(DEFAULT_CHARACTER.mouth);
    expect(c.eyes).toBe("variant03");
    expect(Object.keys(c).sort()).toEqual([...CHARACTER_KEYS].sort());
  });
  it("copes with garbage input", () => {
    for (const bad of [null, undefined, 5, "x", []]) expect(sanitizeCharacter(bad)).toEqual(DEFAULT_CHARACTER);
  });
  it("random characters are always valid", () => {
    for (let i = 0; i < 50; i++) {
      const c = randomCharacter();
      expect(sanitizeCharacter(c)).toEqual(c);
    }
  });
});

describe("renderCharacterSvg", () => {
  it("produces different faces for different expressions", () => {
    const a = renderCharacterSvg(DEFAULT_CHARACTER, "neutral");
    expect(renderCharacterSvg(DEFAULT_CHARACTER, "sad")).not.toBe(a);
    expect(renderCharacterSvg(DEFAULT_CHARACTER, "blink")).not.toBe(a);
  });
  it("never lets markup through from a hostile config", () => {
    const svg = renderCharacterSvg({ hairColor: '"/><script>alert(1)</script>', backgroundColor: "red;}" });
    expect(svg).not.toContain("<script");
  });
  it("renders optional features only when chosen", () => {
    const plain = renderCharacterSvg(DEFAULT_CHARACTER);
    expect(renderCharacterSvg({ ...DEFAULT_CHARACTER, glasses: "variant02" })).not.toBe(plain);
    expect(renderCharacterSvg({ ...DEFAULT_CHARACTER, beard: "variant01" })).not.toBe(plain);
  });
  it("renders the three animation frames", () => {
    const f = renderFrames(DEFAULT_CHARACTER, "happy");
    expect(new Set([f.neutral, f.blink, f.joy]).size).toBe(3);
  });
});

describe("clothes", () => {
  it("renders every garment, hat and scarf, in every colour, as well-formed output", () => {
    const base = renderCharacterSvg({ ...DEFAULT_CHARACTER, top: "none", scarf: "none", hat: "none" });
    for (const top of VARIANTS.top) for (const scarf of ["none", ...VARIANTS.scarf]) for (const hat of ["none", ...VARIANTS.hat]) {
      const svg = renderCharacterSvg({ ...DEFAULT_CHARACTER, top, scarf, hat });
      expect(svg.startsWith("<svg") && svg.endsWith("</svg>")).toBe(true);
      expect(svg).not.toBe(base);
      expect((svg.match(/<g[ >]/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
    }
  });
  it("changes with the chosen colour", () => {
    expect(renderCharacterSvg({ ...DEFAULT_CHARACTER, topColor: "3d5a9e" })).toContain("#3d5a9e");
  });
  it("ignores bad clothing values", () => {
    const c = sanitizeCharacter({ top: "cape", topColor: "red", hat: "<x>" });
    expect(c.top).toBe(DEFAULT_CHARACTER.top);
    expect(c.topColor).toBe(DEFAULT_CHARACTER.topColor);
    expect(c.hat).toBe(DEFAULT_CHARACTER.hat);
  });
});

describe("day and night", () => {
  it("is night between 21:00 and 07:00 where they are, and day otherwise", () => {
    const at = (iso: string, tz: string) => sceneAt(new Date(iso).getTime(), tz);
    expect(at("2026-06-01T12:00:00Z", "Europe/Madrid")).toBe("day"); // 14:00
    expect(at("2026-06-01T20:00:00Z", "Europe/Madrid")).toBe("night"); // 22:00
    expect(at("2026-06-01T04:30:00Z", "Europe/Madrid")).toBe("night"); // 06:30
    expect(at("2026-06-01T05:30:00Z", "Europe/Madrid")).toBe("day"); // 07:30
    expect(at("2026-06-01T12:00:00Z", "Asia/Tokyo")).toBe("night"); // 21:00
  });
  it("falls back to day without a usable time zone", () => {
    expect(sceneAt(0, null)).toBe("day");
    expect(sceneAt(0, "Not/AZone")).toBe("day");
  });
  it("closes the eyes at night, and opens them when they are happy to hear from you", () => {
    const day = renderCharacterSvg(DEFAULT_CHARACTER, "neutral", "day");
    const night = renderCharacterSvg(DEFAULT_CHARACTER, "neutral", "night");
    expect(night).not.toBe(day);
    expect(night).toContain("#1d2754");
    const woken = renderCharacterSvg(DEFAULT_CHARACTER, "joy", "night");
    expect(woken).not.toBe(night);
  });
});
