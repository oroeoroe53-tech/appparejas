import type { CSSProperties } from "react";

/** Tiny hand-drawn stickers for the book pages. Purely decorative, so always hidden from screen readers. */
const STICKERS = {
  heart: <path d="M32 54C12 40 6 30 6 21 6 13 12 8 19 8c5 0 10 3 13 8 3-5 8-8 13-8 7 0 13 5 13 13 0 9-6 19-26 33z" fill="#ef8ea3" stroke="#c4566c" strokeWidth="3" strokeLinejoin="round" />,
  star: <path d="M32 6l7 16 17 2-13 12 4 17-15-9-15 9 4-17L8 24l17-2z" fill="#ffd978" stroke="#e0a63a" strokeWidth="3" strokeLinejoin="round" />,
  flower: (
    <g stroke="#d77aa0" strokeWidth="3">
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="32" cy="16" rx="9" ry="12" fill="#f9b8cf" transform={`rotate(${a} 32 32)`} />)}
      <circle cx="32" cy="32" r="8" fill="#ffd978" stroke="#e0a63a" />
    </g>
  ),
  cloud: <path d="M18 46c-8 0-12-5-12-11s5-10 11-10c2-9 10-14 18-12 7 2 11 8 11 14 6 0 10 4 10 9s-4 10-10 10z" fill="#e3f1f9" stroke="#8cbbd6" strokeWidth="3" strokeLinejoin="round" />,
  sparkle: <path d="M32 4c2 14 6 22 22 28-16 6-20 14-22 28-2-14-6-22-22-28 16-6 20-14 22-28z" fill="#fff2b5" stroke="#e0b84a" strokeWidth="3" strokeLinejoin="round" />,
  envelope: (
    <g strokeLinejoin="round" stroke="#c4566c" strokeWidth="3">
      <rect x="6" y="14" width="52" height="36" rx="5" fill="#fffdf8" />
      <path d="M7 17l25 19 25-19" fill="none" />
      <path d="M32 50c-6-4-8-7-8-10 0-2 1-4 3-4s4 1 5 3c1-2 3-3 5-3s3 2 3 4c0 3-2 6-8 10z" fill="#ef8ea3" strokeWidth="2" />
    </g>
  ),
} as const;
export type StickerName = keyof typeof STICKERS;

export function Sticker({ name, size = 11, style }: { name: StickerName; size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ width: `${size}cqw`, height: `${size}cqw`, position: "absolute", ...style }}>
      {STICKERS[name]}
    </svg>
  );
}

/** A few stickers in the corners, chosen by page number so every page feels a little different. */
export function Sprinkles({ n }: { n: number }) {
  const sets: Array<Array<[StickerName, CSSProperties, number]>> = [
    [["heart", { right: "5cqw", top: "5cqw", transform: "rotate(12deg)" }, 10], ["sparkle", { left: "5cqw", bottom: "5cqw" }, 8], ["star", { right: "7cqw", bottom: "7cqw", transform: "rotate(-10deg)" }, 7]],
    [["flower", { left: "4cqw", top: "4cqw" }, 11], ["heart", { right: "6cqw", bottom: "5cqw", transform: "rotate(-8deg)" }, 8], ["sparkle", { right: "5cqw", top: "9cqw" }, 6]],
    [["cloud", { right: "3cqw", top: "3cqw" }, 14], ["star", { left: "6cqw", bottom: "6cqw", transform: "rotate(14deg)" }, 8], ["heart", { right: "9cqw", bottom: "5cqw" }, 6]],
  ];
  return (
    <>
      {(sets[n % sets.length] ?? []).map(([name, style, size], i) => (
        <Sticker key={i} name={name} size={size} style={style} />
      ))}
    </>
  );
}

export function Tape({ className = "", color, rotate = -4 }: { className?: string; color?: string; rotate?: number }) {
  return <span aria-hidden="true" className={`bk-tape ${className}`} style={{ transform: `rotate(${rotate}deg)`, ...(color ? ({ "--tape": color } as CSSProperties) : {}) }} />;
}
