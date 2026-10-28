import { describe, expect, it } from "vitest";
import { formatMonth, monthStartIn } from "./month";

describe("monthStartIn", () => {
  // 2026-10-31 20:30 UTC is already November 1st in Karachi (UTC+5).
  const lateOctoberUtc = new Date("2026-10-31T20:30:00Z");

  it("uses the given time zone to pick the month", () => {
    expect(monthStartIn("UTC", lateOctoberUtc)).toBe("2026-10-01");
    expect(monthStartIn("Asia/Karachi", lateOctoberUtc)).toBe("2026-11-01");
  });
});

describe("formatMonth", () => {
  it("formats the month name and year", () => {
    expect(formatMonth("2026-10-01")).toBe("October 2026");
  });
});
