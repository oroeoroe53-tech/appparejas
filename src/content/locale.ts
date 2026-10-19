/** Active language. Spanish by default; build with NEXT_PUBLIC_LOCALE=en for English. */
export const LOCALE: "es" | "en" = process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "es";
