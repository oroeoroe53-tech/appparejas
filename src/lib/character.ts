import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";
import { NONE, sanitizeCharacter, type CharacterConfig, type Expression } from "./character-options";

/** How each expression changes the face. Anything not listed keeps the designer's own choice. */
const EXPRESSIONS: Record<Expression, Partial<Record<"mouth" | "eyes", string>>> = {
  neutral: {},
  blink: { eyes: "variant19" },
  joy: { mouth: "happy05" },
  happy: { mouth: "happy03" },
  loved: { mouth: "happy08", eyes: "variant09" },
  calm: { mouth: "happy02" },
  excited: { mouth: "happy16" },
  tired: { mouth: "sad05", eyes: "variant19" },
  sad: { mouth: "sad04" },
  stressed: { mouth: "sad06" },
};

/**
 * Renders a character as an SVG string (Lorelei style by Lisa Wischofsky, CC0).
 * Input is sanitised against the allowed catalogue first, so the output is safe to inline.
 */
export function renderCharacterSvg(raw: unknown, expression: Expression = "neutral"): string {
  const c: CharacterConfig = sanitizeCharacter(raw);
  const over = EXPRESSIONS[expression];
  const opt = (key: "glasses" | "beard" | "earrings" | "hairAccessories") => (c[key] === NONE ? {} : { [key]: [c[key]], [`${key}Probability`]: 100 });
  return createAvatar(lorelei, {
    seed: "us",
    head: [c.head],
    hair: [c.hair],
    hairColor: [c.hairColor],
    skinColor: [c.skinColor],
    eyes: [over.eyes ?? c.eyes],
    eyebrows: [c.eyebrows],
    nose: [c.nose],
    mouth: [over.mouth ?? c.mouth],
    backgroundColor: [c.backgroundColor],
    hairAccessoriesProbability: 0,
    glassesProbability: 0,
    beardProbability: 0,
    earringsProbability: 0,
    frecklesProbability: c.freckles === "on" ? 100 : 0,
    ...opt("glasses"),
    ...opt("beard"),
    ...opt("earrings"),
    ...opt("hairAccessories"),
  } as never).toString();
}

export interface CharacterFrames {
  neutral: string;
  blink: string;
  joy: string;
}

/** The three frames the animated figure needs, rendered once on the server. */
export function renderFrames(raw: unknown, mood: Expression = "neutral"): CharacterFrames {
  return {
    neutral: renderCharacterSvg(raw, mood),
    blink: renderCharacterSvg(raw, mood === "tired" ? "tired" : "blink"),
    joy: renderCharacterSvg(raw, "joy"),
  };
}
