import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";
import { dress, hatFront, scarfFront, topBack, topFront } from "./clothes";
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

export type Scene = "day" | "night";

/** Night from 21:00 to 06:59 in the given time zone; day otherwise. Falls back to day on a bad zone. */
export function sceneAt(nowMs: number, timezone?: string | null): Scene {
  if (!timezone) return "day";
  try {
    const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(new Date(nowMs)));
    return hour >= 21 || hour < 7 ? "night" : "day";
  } catch {
    return "day";
  }
}

const STARS: ReadonlyArray<readonly [number, number, number]> = [[150, 150, 9], [300, 90, 6], [210, 280, 5], [700, 130, 5], [900, 460, 6], [90, 440, 5]];

function star([x, y, r]: readonly [number, number, number]): string {
  const k = r * 0.6;
  return `<path d="M${x} ${y - 2 * r}L${x + k} ${y - k}L${x + 2 * r} ${y}L${x + k} ${y + k}L${x} ${y + 2 * r}L${x - k} ${y + k}L${x - 2 * r} ${y}L${x - k} ${y - k}Z" fill="#fff6c8"/>`;
}

const BACKGROUND_RECT = /<rect fill="#[0-9a-fA-F]{6}"[^>]*\/>/;

/** Night: deep-blue sky with a moon and stars. Day: a warm sun in the corner. */
function withScene(svg: string, scene?: Scene): string {
  if (!scene) return svg;
  if (scene === "night") {
    const sky = `<rect fill="#1d2754" width="980" height="980"/>`;
    const stars = STARS.map(star).join("");
    const moon = `<circle cx="800" cy="170" r="92" fill="#fff3b8"/><circle cx="836" cy="146" r="80" fill="#1d2754"/>`;
    return svg.replace(BACKGROUND_RECT, `${sky}${stars}${moon}`);
  }
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<path d="M${Math.round(820 + Math.cos(a) * 92)} ${Math.round(160 + Math.sin(a) * 92)}L${Math.round(820 + Math.cos(a) * 132)} ${Math.round(160 + Math.sin(a) * 132)}" stroke="#f8c24a" stroke-width="16" stroke-linecap="round"/>`;
  }).join("");
  const sun = `<circle cx="820" cy="160" r="70" fill="#ffd45e"/>${rays}`;
  return svg.replace(BACKGROUND_RECT, (m) => `${m}${sun}`);
}

/**
 * Renders a character as an SVG string (Lorelei style by Lisa Wischofsky, CC0).
 * Input is sanitised against the allowed catalogue first, so the output is safe to inline.
 */
export function renderCharacterSvg(raw: unknown, expression: Expression = "neutral", scene?: Scene): string {
  const c: CharacterConfig = sanitizeCharacter(raw);
  const over = EXPRESSIONS[expression];
  const opt = (key: "glasses" | "beard" | "earrings" | "hairAccessories") => (c[key] === NONE ? {} : { [key]: [c[key]], [`${key}Probability`]: 100 });
  const svg = createAvatar(lorelei, {
    seed: "us",
    head: [c.head],
    hair: [c.hair],
    hairColor: [c.hairColor],
    skinColor: [c.skinColor],
    // At night they sleep, unless a message has just woken them up (joy).
    eyes: [scene === "night" && expression !== "joy" ? "variant19" : (over.eyes ?? c.eyes)],
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
  return withScene(dress(svg, {
    back: c.top === NONE ? "" : topBack(c.top, c.topColor),
    front:
      (c.top === NONE ? "" : topFront(c.top, c.topColor)) +
      (c.scarf === NONE ? "" : scarfFront(c.scarf, c.scarfColor)) +
      (c.hat === NONE ? "" : hatFront(c.hat, c.hatColor)),
  }), scene);
}

export interface CharacterFrames {
  neutral: string;
  blink: string;
  joy: string;
}

/** The three frames the animated figure needs, rendered once on the server. */
export function renderFrames(raw: unknown, mood: Expression = "neutral", scene?: Scene): CharacterFrames {
  return {
    neutral: renderCharacterSvg(raw, mood, scene),
    blink: renderCharacterSvg(raw, mood === "tired" ? "tired" : "blink", scene),
    joy: renderCharacterSvg(raw, "joy", scene),
  };
}

/** For figures that never animate (lists, the Us header): one render instead of three. */
export function renderStill(raw: unknown, mood: Expression = "neutral"): CharacterFrames {
  const svg = renderCharacterSvg(raw, mood);
  return { neutral: svg, blink: svg, joy: svg };
}
