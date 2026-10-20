import { describe, expect, it } from "vitest";
import { groupByPlace, isLatLng, roundCoord } from "./places";

describe("places", () => {
  it("rounds to about a metre", () => {
    expect(roundCoord(38.722251234)).toBe(38.72225);
    expect(roundCoord(-9.139337)).toBe(-9.13934);
  });
  it("accepts only real coordinates", () => {
    expect(isLatLng(38.7, -9.1)).toBe(true);
    expect(isLatLng(91, 0)).toBe(false);
    expect(isLatLng(0, 181)).toBe(false);
    expect(isLatLng(Number.NaN, 0)).toBe(false);
    expect(isLatLng("1", "2")).toBe(false);
  });
  it("groups photos taken at nearly the same spot and skips the ones without a place", () => {
    const pins = groupByPlace([
      { id: 1, lat: 38.72231, lng: -9.13931 },
      { id: 2, lat: 38.72244, lng: -9.13902 },
      { id: 3, lat: 36.7213, lng: -4.4214 },
      { id: 4, lat: null, lng: null },
    ]);
    expect(pins).toHaveLength(2);
    expect(pins.find((p) => p.items.length === 2)?.items.map((i) => i.id)).toEqual([1, 2]);
  });
});
