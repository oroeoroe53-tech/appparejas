import { describe, expect, it } from "vitest";
import { audioFormat, formatDuration, isMediaPath, mediaPath } from "./media";

const space = "11111111-2222-4333-8444-555555555555";

describe("media paths", () => {
  it("builds paths inside the couple folder that pass validation", () => {
    for (const [kind, ext] of [["voice", "webm"], ["voice", "m4a"], ["drawing", "png"], ["photos", "jpg"], ["story", "webp"]] as const) {
      const p = mediaPath(space, kind, ext);
      expect(p.startsWith(`${space}/${kind}/`)).toBe(true);
      expect(isMediaPath(p, space, kind)).toBe(true);
    }
  });
  it("rejects the wrong space, kind, extension or traversal", () => {
    const good = mediaPath(space, "photos", "jpg");
    expect(isMediaPath(good, "99999999-2222-4333-8444-555555555555", "photos")).toBe(false);
    expect(isMediaPath(good, space, "story")).toBe(false);
    expect(isMediaPath(`${space}/photos/../../etc/passwd`, space, "photos")).toBe(false);
    expect(isMediaPath(`${space}/photos/not-a-uuid.jpg`, space, "photos")).toBe(false);
    expect(isMediaPath(good.replace(".jpg", ".exe"), space, "photos")).toBe(false);
  });
  it("refuses unsupported extensions when building", () => {
    expect(() => mediaPath(space, "voice", "exe")).toThrow();
  });
});

describe("audioFormat", () => {
  it("maps recorder types to stored formats", () => {
    expect(audioFormat("audio/webm;codecs=opus")).toEqual({ contentType: "audio/webm", ext: "webm" });
    expect(audioFormat("audio/mp4")).toEqual({ contentType: "audio/mp4", ext: "m4a" });
    expect(audioFormat("audio/ogg;codecs=opus").ext).toBe("ogg");
    expect(audioFormat("").ext).toBe("webm");
  });
  it("formats durations", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(125)).toBe("2:05");
  });
});
