import { describe, expect, it } from "vitest";
import { buildEventPayload, buildMessagePayload, PREVIEW_MAX_CHARS } from "./notifications";
import { MESSAGE_TYPES } from "./message-types";

const secret = "I love you more than I can say, Ben";
const base = { messageId: "abc-123", senderName: "Bunny", content: secret };

describe("buildMessagePayload", () => {
  it.each(MESSAGE_TYPES)("private mode never leaks content or the sender name (%s)", (type) => {
    const p = buildMessagePayload({ ...base, type, previewMode: "generic" });
    const blob = JSON.stringify(p);
    expect(blob).not.toContain("love you");
    expect(blob).not.toContain("Bunny");
    expect(p.body.length).toBeGreaterThan(0);
  });

  it("has a distinct warm line per type in private mode", () => {
    const lines = new Set(MESSAGE_TYPES.map((type) => buildMessagePayload({ ...base, type, previewMode: "generic" }).body));
    expect(lines.size).toBe(MESSAGE_TYPES.length);
  });

  it("shows the sender and the actual words in full mode", () => {
    const p = buildMessagePayload({ ...base, type: "quick", previewMode: "full" });
    expect(p.title).toBe("Bunny");
    expect(p.body).toBe(secret);
  });

  it("truncates long text in full mode", () => {
    const p = buildMessagePayload({ ...base, content: "x".repeat(900), type: "love_letter", previewMode: "full" });
    expect(Array.from(p.body).length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  });

  it("describes wordless and media messages instead of showing placeholder text", () => {
    expect(buildMessagePayload({ ...base, content: "Thinking of you", type: "thinking_of_you", previewMode: "full" }).body).toMatch(/thinking of you/i);
    expect(buildMessagePayload({ ...base, content: "Voice note", type: "voice_note", previewMode: "full" }).body).toMatch(/voice note/i);
    expect(buildMessagePayload({ ...base, content: "Drawing", type: "drawing", previewMode: "full" }).body).toMatch(/drawing/i);
  });

  it("makes the phone buzz for a hug, in both privacy modes, and for nothing else", () => {
    const full = buildMessagePayload({ ...base, content: "A hug", type: "hug", previewMode: "full" });
    const generic = buildMessagePayload({ ...base, content: "A hug", type: "hug", previewMode: "generic" });
    expect(full.vibrate?.length).toBeGreaterThan(2);
    expect(generic.vibrate).toEqual(full.vibrate);
    expect(full.body).toMatch(/hug/i);
    expect(buildMessagePayload({ ...base, type: "quick", previewMode: "full" }).vibrate).toBeUndefined();
  });

  it("deep-links to the message and tags per message so duplicates collapse", () => {
    const p = buildMessagePayload({ ...base, type: "little_note", previewMode: "generic" });
    expect(p.url).toBe("/letters/abc-123");
    expect(p.tag).toBe("message-abc-123");
  });
});

describe("drawing notification picture", () => {
  const url = "https://x.supabase.co/storage/v1/object/sign/couple-media/a.png?token=t";
  it("is attached only for drawings in full mode", () => {
    expect(buildMessagePayload({ ...base, type: "drawing", previewMode: "full", imageUrl: url }).image).toBe(url);
    expect(buildMessagePayload({ ...base, type: "drawing", previewMode: "generic", imageUrl: url }).image).toBeUndefined();
    expect(buildMessagePayload({ ...base, type: "quick", previewMode: "full", imageUrl: url }).image).toBeUndefined();
  });
  it("refuses non-https links", () => {
    expect(buildMessagePayload({ ...base, type: "drawing", previewMode: "full", imageUrl: "http://x/a.png" }).image).toBeUndefined();
  });
});

describe("buildEventPayload", () => {
  const input = { tag: "coupon-1", url: "/us/coupons", fullTitle: "Bunny", fullBody: "Gave you a coupon: breakfast in bed", genericBody: "You have a little surprise." };
  it("respects the privacy choice", () => {
    expect(buildEventPayload({ ...input, previewMode: "full" }).body).toContain("breakfast");
    const generic = JSON.stringify(buildEventPayload({ ...input, previewMode: "generic" }));
    expect(generic).not.toContain("breakfast");
    expect(generic).not.toContain("Bunny");
  });
});
