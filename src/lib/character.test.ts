import { describe, expect, it } from "vitest";
import * as lorelei from "@dicebear/lorelei";
import { CHARACTER_KEYS, DEFAULT_CHARACTER, MOODS, randomCharacter, sanitizeCharacter, VARIANTS } from "./character-options";
import { renderCharacterSvg, renderFrames } from "./character";

const schema = lorelei.schema.properties as Record<string, { items?: { enum?: string[] } }>;

describe("character catalogue", () => {
  it("matches the options the rendering library really supports", () => {
    for (const [key, list] of Object.entries(VARIANTS)) {
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
