/** Accepts a full invitation link, a path, or a bare code (spaces/dashes tolerated) and returns the token. */
export function parseInviteToken(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromUrl = /\/join\/([A-Za-z0-9]+)/.exec(raw);
  const candidate = (fromUrl?.[1] ?? raw).replace(/[\s-]+/g, "").toLowerCase();
  return /^[a-f0-9]{40}$/.test(candidate) ? candidate : null;
}

/** Friendly grouping for showing/typing a code: abcde-fghij-... */
export function formatInviteCode(token: string): string {
  return token.match(/.{1,5}/g)?.join("-") ?? token;
}
