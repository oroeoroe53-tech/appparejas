import { en } from "./en";
import { es } from "./es";
import { LOCALE } from "./locale";

/** Active catalogue. Both languages share one shape, so a missing string is a type error. */
export const t = LOCALE === "en" ? en : es;
export type { Copy } from "./en";
export { LOCALE };
