import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
  it("formats zero as 00:00:00.00", () => {
    expect(formatDuration(0)).toBe("00:00:00.00");
  });

  it("formats sub-second durations", () => {
    expect(formatDuration(450)).toBe("00:00:00.45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(65_000)).toBe("00:01:05.00");
  });

  it("formats hours", () => {
    expect(formatDuration(2 * 3_600_000 + 3 * 60_000 + 4_000 + 50)).toBe("02:03:04.05");
  });

  it("rounds to the nearest centisecond", () => {
    // 999.6 ms rounds to 100 centis -> carries into the next second
    expect(formatDuration(999.6)).toBe("00:00:01.00");
  });

  it("pads all fields to two digits", () => {
    expect(formatDuration(9_000)).toBe("00:00:09.00");
  });
});
