import { describe, expect, it } from "vitest";
import { formatInviteCode, parseInviteToken } from "./invite";
import { safeNext } from "./safe-next";
import { sameOrigin } from "./same-origin";

const token = "0123456789abcdef0123456789abcdef01234567";

describe("parseInviteToken", () => {
  it("accepts a bare token, a formatted code and a full link", () => {
    expect(parseInviteToken(token)).toBe(token);
    expect(parseInviteToken(formatInviteCode(token))).toBe(token);
    expect(parseInviteToken(` https://us.example/join/${token}?x=1 `)).toBe(token);
    expect(parseInviteToken(token.toUpperCase())).toBe(token);
  });
  it("rejects garbage, wrong length and non-hex", () => {
    for (const bad of ["", "hello", token.slice(1), token + "0", "z".repeat(40), "../../etc/passwd"]) {
      expect(parseInviteToken(bad)).toBeNull();
    }
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/letters/1?x=2")).toBe("/letters/1?x=2");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined, "/ok\nSet-Cookie: x"]) {
      expect(safeNext(bad)).toBe("/home");
    }
  });
});

describe("sameOrigin", () => {
  const req = (origin: string | null, host = "us.example") =>
    new Request("https://us.example/api/x", { method: "POST", headers: { ...(origin ? { origin } : {}), host } });
  it("accepts only requests whose Origin matches the host", () => {
    expect(sameOrigin(req("https://us.example"))).toBe(true);
    expect(sameOrigin(req("https://evil.example"))).toBe(false);
    expect(sameOrigin(req(null))).toBe(false);
    expect(sameOrigin(req("not a url"))).toBe(false);
  });
});
