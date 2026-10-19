/** Only allow same-site relative paths as post-login destinations (prevents open redirects). */
export function safeNext(value: string | null | undefined, fallback = "/home"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("\n") || value.includes("\r")) return fallback;
  return value;
}
