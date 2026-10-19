import { describe, expect, it } from "vitest";
import { daysAway, fromDayNumber, nextOccurrence, toDayNumber, upcoming, type EventRow } from "./dates";

describe("nextOccurrence", () => {
  it("keeps one-off events and drops past ones", () => {
    expect(nextOccurrence("2026-12-24", false, "2026-10-19")).toBe("2026-12-24");
    expect(nextOccurrence("2026-10-19", false, "2026-10-19")).toBe("2026-10-19");
    expect(nextOccurrence("2026-01-01", false, "2026-10-19")).toBeNull();
  });
  it("repeats yearly and rolls over to next year", () => {
    expect(nextOccurrence("2020-11-02", true, "2026-10-19")).toBe("2026-11-02");
    expect(nextOccurrence("2020-03-02", true, "2026-10-19")).toBe("2027-03-02");
    expect(nextOccurrence("2020-10-19", true, "2026-10-19")).toBe("2026-10-19");
  });
  it("moves 29 February to the 28th in common years", () => {
    expect(nextOccurrence("2024-02-29", true, "2026-01-10")).toBe("2026-02-28");
    expect(nextOccurrence("2024-02-29", true, "2027-03-01")).toBe("2028-02-29");
  });
});

describe("day arithmetic", () => {
  it("round-trips and counts days", () => {
    expect(fromDayNumber(toDayNumber("2026-10-19"))).toBe("2026-10-19");
    expect(daysAway("2026-10-29", "2026-10-19")).toBe(10);
    expect(daysAway("2027-01-01", "2026-12-31")).toBe(1);
  });
});

describe("upcoming", () => {
  const ev = (id: string, date: string, repeat = false): EventRow => ({ id, title: id, note: null, event_date: date, repeat_yearly: repeat, kind: "plan" });
  it("sorts by how soon and respects the horizon", () => {
    const list = upcoming({ events: [ev("far", "2027-06-01"), ev("soon", "2026-10-25"), ev("past", "2026-01-01")], togetherSince: null, today: "2026-10-19", horizon: 60 });
    expect(list.map((i) => i.key)).toEqual(["e-soon"]);
  });
  it("adds milestones counting Day 1 as the first day", () => {
    // Day 100 is 99 days after Day 1.
    const list = upcoming({ events: [], togetherSince: "2026-07-12", today: "2026-10-19", horizon: 30 });
    const hundred = list.find((i) => i.source === "milestone" && i.count === 100);
    expect(hundred?.date).toBe("2026-10-19");
    expect(hundred?.daysAway).toBe(0);
  });
  it("adds the next yearly anniversary with its year count", () => {
    const list = upcoming({ events: [], togetherSince: "2024-11-02", today: "2026-10-19", horizon: 30 });
    const a = list.find((i) => i.source === "anniversary");
    expect(a).toMatchObject({ date: "2026-11-02", count: 2, daysAway: 14 });
  });
});

import { QUESTIONS, QUESTIONS_EN, QUESTIONS_ES, questionForDay } from "@/content/questions";
describe("questionForDay", () => {
  it("is stable within a day, changes daily, and wraps around", () => {
    const d = toDayNumber("2026-10-19");
    expect(questionForDay(d)).toBe(questionForDay(d));
    expect(questionForDay(d)).not.toBe(questionForDay(d + 1));
    expect(questionForDay(d + QUESTIONS.length)).toBe(questionForDay(d));
    expect(questionForDay(toDayNumber("1999-01-01"))).toBeTruthy();
  });
  it("keeps both languages the same length", () => {
    expect(QUESTIONS_ES.length).toBe(QUESTIONS_EN.length);
  });
  it("has no duplicate questions", () => {
    expect(new Set(QUESTIONS).size).toBe(QUESTIONS.length);
  });
});
