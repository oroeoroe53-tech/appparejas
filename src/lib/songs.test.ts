import { describe, expect, it } from "vitest";
import { clampClip, formatClock, isApplePreviewUrl, parseItunesResults, songInputSchema } from "./songs";

const good = {
  wrapperType: "track", kind: "song", trackId: 1440650428, trackName: "Sample Song", artistName: "Sample Artist",
  previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/v4/a/b/c/x.m4a",
  artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music/x/100x100bb.jpg",
};

describe("parseItunesResults", () => {
  it("keeps valid Apple-hosted songs", () => {
    expect(parseItunesResults({ results: [good] })).toEqual([
      { trackId: "1440650428", title: "Sample Song", artist: "Sample Artist", previewUrl: good.previewUrl, artworkUrl: good.artworkUrl100 },
    ]);
  });
  it("drops tracks without a preview, with foreign hosts, or malformed", () => {
    const results = [
      { ...good, previewUrl: undefined },
      { ...good, previewUrl: "https://evil.example/a.m4a" },
      { ...good, previewUrl: "https://itunes.apple.com.evil.example/a.m4a" },
      { ...good, previewUrl: "http://audio-ssl.itunes.apple.com/a.m4a" },
      { ...good, trackId: "nope" },
      "junk",
      null,
    ];
    expect(parseItunesResults({ results })).toEqual([]);
  });
  it("ignores a bad artwork host by dropping that result", () => {
    expect(parseItunesResults({ results: [{ ...good, artworkUrl100: "https://evil.example/i.jpg" }] })).toEqual([]);
  });
  it("tolerates unexpected payload shapes", () => {
    for (const p of [null, undefined, {}, { results: "x" }, []]) expect(parseItunesResults(p)).toEqual([]);
  });
});

describe("clip helpers", () => {
  it("clamps the clip inside the 30 second preview", () => {
    expect(clampClip(25, 15)).toEqual({ start: 15, duration: 15 });
    expect(clampClip(-4, 1)).toEqual({ start: 0, duration: 3 });
    expect(clampClip(29, 30)).toEqual({ start: 0, duration: 30 });
  });
  it("formats clock times", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75)).toBe("1:15");
  });
  it("validates the browser input strictly", () => {
    expect(songInputSchema.safeParse({ trackId: "123", start: 5, duration: 10 }).success).toBe(true);
    expect(songInputSchema.safeParse({ trackId: "12a", start: 5, duration: 10 }).success).toBe(false);
    expect(songInputSchema.safeParse({ trackId: "123", start: 25, duration: 10 }).success).toBe(false);
    expect(songInputSchema.safeParse({ trackId: "123", start: 0, duration: 2 }).success).toBe(false);
    expect(songInputSchema.safeParse({ trackId: "123", start: 1.5, duration: 10 }).success).toBe(false);
  });
  it("only accepts Apple preview hosts", () => {
    expect(isApplePreviewUrl("https://audio-ssl.itunes.apple.com/x.m4a")).toBe(true);
    expect(isApplePreviewUrl("https://x.mzstatic.com/y.m4a")).toBe(true);
    expect(isApplePreviewUrl("https://mzstatic.com.evil.example/y.m4a")).toBe(false);
  });
});
