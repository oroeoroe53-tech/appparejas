import type { MessageType } from "@/lib/message-types";

/** Tiny closed-object illustration per message style, used on the home object, lists and the style picker. */
export function TypeGlyph({ type, size = 48 }: { type: MessageType; size?: number }) {
  const common = { width: size, height: size * 0.75, viewBox: "0 0 64 48", "aria-hidden": true as const, fill: "none" };
  switch (type) {
    case "love_letter":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="56" height="38" rx="4" fill="#ecd0c8" />
          <path d="M4 10l28 20 28-20" stroke="#c99d93" strokeWidth="1.5" />
          <circle cx="32" cy="29" r="6" fill="#9d394d" />
        </svg>
      );
    case "little_note":
      return (
        <svg {...common}>
          <g transform="rotate(-5 32 24)">
            <rect x="12" y="5" width="40" height="38" rx="2" fill="#fffdf8" stroke="#e5d7c8" />
            <rect x="24" y="2" width="16" height="6" rx="1" fill="#e9b8b8" />
            <path d="M18 18h28M18 25h28M18 32h18" stroke="#9d394d" strokeOpacity="0.35" strokeWidth="1.4" />
          </g>
        </svg>
      );
    case "heart_message":
      return (
        <svg {...common}>
          <path d="M32 42C14 29 8 21 8 14 8 8 13 4 19 4c5 0 10 3 13 8 3-5 8-8 13-8 6 0 11 4 11 10 0 7-6 15-24 28z" fill="#e9b8b8" stroke="#9d394d" strokeWidth="1.6" />
        </svg>
      );
    case "hug_in_words":
      return (
        <svg {...common}>
          <rect x="6" y="4" width="52" height="40" rx="10" fill="#f6d3cf" />
          <path d="M6 14c8 2 12 10 12 18 0 6-3 10-8 12M58 14c-8 2-12 10-12 18 0 6 3 10 8 12" stroke="#9d394d" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="32" cy="14" r="2" fill="#9d394d" />
        </svg>
      );
    case "secret_message":
      return (
        <svg {...common}>
          <rect x="6" y="4" width="52" height="40" rx="7" fill="#3b2029" />
          <path d="M16 15h32M16 22h24" stroke="#fff" strokeOpacity="0.2" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="32" cy="33" r="6" fill="#9d394d" />
        </svg>
      );
  }
}
