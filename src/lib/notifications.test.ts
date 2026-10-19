import { describe, expect, it } from "vitest";
import { buildMessagePayload, PREVIEW_MAX_CHARS } from "./notifications";
import { MESSAGE_TYPES } from "./message-types";

const secret = "I love you more than I can say, Ben";
const base = { messageId: "abc-123", senderName: "Ana", content: secret };

describe("buildMessagePayload", () => {
  it.each(MESSAGE_TYPES)("generic mode never leaks content or sender name (%s)", (type) => {
    const p = buildMessagePayload({ ...base, type, previewMode: "generic" });
    const blob = JSON.stringify(p);
    expect(blob).not.toContain("love you");
    expect(blob).not.toContain("Ana");
    expect(p.body.length).toBeGreaterThan(0);
  });

  it("uses a different warm line per type", () => {
    const lines = new Set(MESSAGE_TYPES.map((type) => buildMessagePayload({ ...base, type, previewMode: "generic" }).body));
    expect(lines.size).toBe(MESSAGE_TYPES.length);
  });

  it("full mode shows the sender and a truncated preview", () => {
    const long = "x".repeat(500);
    const p = buildMessagePayload({ ...base, content: long, type: "love_letter", previewMode: "full" });
    expect(p.title).toBe("Ana");
    expect(Array.from(p.body).length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
    expect(buildMessagePayload({ ...base, type: "little_note", previewMode: "full" }).body).toBe(secret);
  });

  it("deep-links to the message and tags per message so duplicates collapse", () => {
    const p = buildMessagePayload({ ...base, type: "little_note", previewMode: "generic" });
    expect(p.url).toBe("/letters/abc-123");
    expect(p.tag).toBe("message-abc-123");
  });
});
