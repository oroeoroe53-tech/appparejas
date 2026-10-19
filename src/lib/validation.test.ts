import { describe, expect, it } from "vitest";
import { MESSAGE_LIMITS, MESSAGE_TYPES } from "./message-types";
import { profileSchema, pushSubscriptionSchema, registerSchema, sendMessageSchema } from "./validation";

const clientId = "11111111-1111-4111-8111-111111111111";

describe("sendMessageSchema", () => {
  it("accepts a normal message and trims it", () => {
    const r = sendMessageSchema.parse({ content: "  hello  ", type: "little_note", clientId });
    expect(r.content).toBe("hello");
  });

  it("rejects empty or whitespace-only content", () => {
    expect(sendMessageSchema.safeParse({ content: "   \n ", type: "love_letter", clientId }).success).toBe(false);
  });

  it.each(MESSAGE_TYPES)("enforces the %s length limit exactly", (type) => {
    const max = MESSAGE_LIMITS[type];
    expect(sendMessageSchema.safeParse({ content: "a".repeat(max), type, clientId }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ content: "a".repeat(max + 1), type, clientId }).success).toBe(false);
  });

  it("counts emoji as one character, like the UI counter", () => {
    expect(sendMessageSchema.safeParse({ content: "💌".repeat(280), type: "little_note", clientId }).success).toBe(true);
  });

  it("rejects unknown types and malformed idempotency keys", () => {
    expect(sendMessageSchema.safeParse({ content: "x", type: "sms", clientId }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ content: "x", type: "little_note", clientId: "nope" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalises email and enforces password length", () => {
    expect(registerSchema.parse({ email: " A@B.CO ", password: "12345678", displayName: "Ana" }).email).toBe("a@b.co");
    expect(registerSchema.safeParse({ email: "a@b.co", password: "short", displayName: "Ana" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.co", password: "12345678", displayName: " " }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("only allows https avatars and turns empties into null", () => {
    expect(profileSchema.parse({ displayName: "Ana", avatarUrl: "" }).avatarUrl).toBeNull();
    expect(profileSchema.parse({ displayName: "Ana", avatarUrl: "https://x.example/a.png" }).avatarUrl).toBe("https://x.example/a.png");
    expect(profileSchema.safeParse({ displayName: "Ana", avatarUrl: "http://x.example/a.png" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Ana", avatarUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("pushSubscriptionSchema", () => {
  it("requires an https endpoint and both keys", () => {
    const keys = { p256dh: "a".repeat(20), auth: "b".repeat(20) };
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/x", keys }).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "http://push.example/x", keys }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/x", keys: { p256dh: "a".repeat(20) } }).success).toBe(false);
  });
});
