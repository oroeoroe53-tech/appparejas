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
    case "quick":
      return (
        <svg {...common}>
          <path d="M8 8h48a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H30l-10 9v-9H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#f7e6e3" stroke="#9d394d" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 18h36M14 26h22" stroke="#9d394d" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "thinking_of_you":
      return (
        <svg {...common}>
          <circle cx="32" cy="24" r="20" stroke="#e9b8b8" strokeWidth="1.5" />
          <circle cx="32" cy="24" r="12" stroke="#e9b8b8" strokeWidth="1.5" />
          <path d="M32 33c-9-7-12-11-12-15 0-4 3-6 6-6 3 0 5 1.5 6 4 1-2.5 3-4 6-4 3 0 6 2 6 6 0 4-3 8-12 15z" fill="#9d394d" />
        </svg>
      );
    case "voice_note":
      return (
        <svg {...common}>
          <rect x="6" y="8" width="52" height="32" rx="16" fill="#f7e6e3" />
          <path d="M16 24v0M22 18v12M28 14v20M34 20v8M40 16v16M46 21v6" stroke="#9d394d" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case "drawing":
      return (
        <svg {...common}>
          <rect x="10" y="4" width="44" height="40" rx="3" fill="#fffdf8" stroke="#e5d7c8" />
          <path d="M18 32c6-14 10 6 16-6s8-2 12-8" stroke="#9d394d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "old_letter":
      return (
        <svg {...common}>
          <path d="M6 9c4-3 8 1 12-2s8 2 12-1 8 2 12-1 8 1 12-1v34c-4 3-8-1-12 2s-8-2-12 1-8-2-12 1-8-1-12 1z" fill="#e6cf9f" stroke="#b9975c" strokeWidth="1.2" />
          <path d="M16 19h32M16 26h26M16 33h18" stroke="#6b4a26" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="46" cy="35" r="6" fill="#9d394d" />
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
