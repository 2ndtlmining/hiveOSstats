import { describe, expect, it } from "vitest";
import type { TimeSeriesPoint } from "@/types";
import { fromColumns, toColumns, weeklyMeans } from "../series-format";

describe("weeklyMeans", () => {
  it("averages each ISO week over the days an item was present", () => {
    const points: TimeSeriesPoint[] = [
      { date: "2026-01-05", A: 10 },          // Monday
      { date: "2026-01-07", A: 20, B: 4 },
      { date: "2026-01-11", A: 30 },          // Sunday, same week
      { date: "2026-01-12", A: 1 },           // next Monday
    ];
    expect(weeklyMeans(points, ["A", "B"])).toEqual([
      { date: "2026-01-05", A: 20, B: 4 },
      { date: "2026-01-12", A: 1 },
    ]);
  });
});

describe("columns", () => {
  it("round-trips points, keeping absent values absent", () => {
    const points: TimeSeriesPoint[] = [{ date: "2026-01-01", A: 1 }, { date: "2026-01-02", A: 2, B: 3 }];
    const columns = toColumns(points, ["A", "B"]);
    expect(columns).toEqual({ dates: ["2026-01-01", "2026-01-02"], series: { A: [1, 2], B: [null, 3] } });
    expect(fromColumns(columns)).toEqual(points);
  });
});
