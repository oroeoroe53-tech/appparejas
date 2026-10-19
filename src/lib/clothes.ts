/**
 * Hand-drawn clothing layers for the characters (same 980×980 canvas as the Lorelei faces).
 * Pure functions of catalogue-validated values, so the SVG they return is safe to inline.
 */

const INK = "#000";
const STROKE = `stroke="${INK}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"`;

/** Darkens (negative) or lightens (positive) a 6-digit hex colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex, 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    const out = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
}

/** Shoulders and chest. The neckline dips to y≈916 so it always hides the base of the neck. */
const BODY = "M24 990C30 900 150 852 300 838L384 832Q506 1010 628 832L690 838C830 852 950 900 956 990Z";

export type TopKind = "tee" | "hoodie" | "sweater";

/** Parts drawn behind the head (the hood). */
export function topBack(kind: string, color: string): string {
  if (kind !== "hoodie") return "";
  return `<path d="M196 810C206 690 380 636 506 636S806 690 816 810L840 920H172Z" fill="#${shade(color, -0.18)}" ${STROKE}/>`;
}

/** Parts drawn in front of the head: the garment itself. */
export function topFront(kind: string, color: string): string {
  const c = `#${color}`;
  const dark = `#${shade(color, -0.2)}`;
  if (kind === "tee") {
    return (
      `<path d="${BODY}" fill="${c}" ${STROKE}/>` +
      `<path d="M384 832Q506 1010 628 832" fill="none" stroke="${dark}" stroke-width="22" stroke-linecap="round"/>` +
      `<path d="M120 930C140 905 190 880 250 866" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round" opacity=".5"/>` +
      `<path d="M890 930C870 905 820 880 760 866" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round" opacity=".5"/>`
    );
  }
  if (kind === "hoodie") {
    return (
      `<path d="${BODY}" fill="${c}" ${STROKE}/>` +
      `<path d="M384 832Q506 1010 628 832" fill="none" stroke="${dark}" stroke-width="26" stroke-linecap="round"/>` +
      `<path d="M444 905C440 940 442 965 436 990M568 905C572 940 570 965 576 990" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>` +
      `<circle cx="436" cy="982" r="9" fill="#fff" ${STROKE}/><circle cx="576" cy="982" r="9" fill="#fff" ${STROKE}/>`
    );
  }
  // sweater: chunky rib collar and a stripe across the chest
  return (
    `<path d="${BODY}" fill="${c}" ${STROKE}/>` +
    `<path d="M40 940C140 905 300 895 392 902L400 934C300 930 160 950 36 978Z" fill="${dark}" opacity=".45"/>` +
    `<path d="M972 940C872 905 712 895 620 902L612 934C712 930 852 950 976 978Z" fill="${dark}" opacity=".45" transform="translate(-20 0)"/>` +
    `<path d="M384 832Q506 1010 628 832" fill="none" stroke="${dark}" stroke-width="34" stroke-linecap="round"/>` +
    `<path d="M384 832Q506 1010 628 832" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round" opacity=".6"/>`
  );
}

/** A wrapped scarf with one tail hanging down the front. */
export function scarfFront(kind: string, color: string): string {
  if (kind === "none") return "";
  const c = `#${color}`;
  const dark = `#${shade(color, -0.22)}`;
  const stripes =
    kind === "striped"
      ? `<path d="M318 822L336 886M384 842L394 910M454 856L458 926M526 860L526 930M598 852L596 922M664 836L652 902" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".85"/>` +
        `<path d="M580 910L618 1030M648 898L690 1018" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".85"/>`
      : "";
  return (
    // tail
    `<path d="M560 880L560 890C575 940 590 985 602 1040L700 1012C676 960 664 920 650 872Z" fill="${dark}" ${STROKE}/>` +
    // wrap
    `<path d="M296 818C330 880 420 932 506 936S680 880 716 818C730 800 724 770 700 770C680 810 600 868 506 868S332 810 312 770C288 770 282 800 296 818Z" fill="${c}" ${STROKE}/>` +
    stripes
  );
}

/** Hats sit on top of the hair. */
export function hatFront(kind: string, color: string): string {
  if (kind === "none") return "";
  const c = `#${color}`;
  const dark = `#${shade(color, -0.2)}`;
  const light = `#${shade(color, 0.35)}`;
  if (kind === "cap") {
    return (
      `<path d="M214 372C206 210 330 118 480 112C640 108 744 230 736 372Z" fill="${c}" ${STROKE}/>` +
      `<path d="M480 112L474 372" stroke="${dark}" stroke-width="7" fill="none"/>` +
      `<path d="M718 360C800 356 880 372 920 410C860 430 760 430 716 404Z" fill="${dark}" ${STROKE}/>` +
      `<circle cx="478" cy="108" r="14" fill="${dark}" ${STROKE}/>`
    );
  }
  const dome = `<path d="M206 372C196 190 330 96 480 92C640 88 758 210 748 372Z" fill="${c}" ${STROKE}/>`;
  const ribs = `<path d="M300 150L288 360M384 112L376 360M480 96L476 360M576 112L582 360M660 150L672 360" stroke="${dark}" stroke-width="7" fill="none" opacity=".55"/>`;
  const cuff = `<rect x="188" y="330" width="578" height="96" rx="40" fill="${dark}" ${STROKE}/>` +
    `<path d="M236 362H718M236 394H718" stroke="${light}" stroke-width="6" opacity=".6" stroke-linecap="round"/>`;
  const pom = kind === "pompom"
    ? `<circle cx="478" cy="78" r="56" fill="${light}" ${STROKE}/><path d="M446 56l14 12M486 40l-6 16M506 80l16-6M452 98l12-10" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity=".6"/>`
    : "";
  return dome + ribs + cuff + pom;
}

/** Inserts the clothing layers into a Lorelei SVG: behind-the-head parts first, the rest on top. */
export function dress(svg: string, layers: { back: string; front: string }): string {
  let out = svg;
  if (layers.back) out = out.replace(/<rect fill="#[0-9a-fA-F]{6}"[^>]*\/>/, (m) => `${m}${layers.back}`);
  if (layers.front) out = out.replace(/<\/g><\/svg>$/, `${layers.front}</g></svg>`);
  return out;
}
