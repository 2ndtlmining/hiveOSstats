import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MoversModule = typeof import("../movers");

let dir: string;
let movers: MoversModule;

function writeCoins(date: string, coins: Record<string, number>) {
  const snapshot = `${date} 06:00:00`;
  const items = Object.fromEntries(
    Object.entries(coins).map(([name, amount]) => [name, { name, amount, snapshot }])
  );
  fs.writeFileSync(
    path.join(dir, `cleaned_data_x_${date}_06-00-00.json`),
    JSON.stringify({
      coins: items, algos: {}, gpu_brands: {}, nvidia_models: {},
      amd_models: {}, miners: {}, asic_models: {},
    })
  );
}

/** One snapshot per day from 2026-01-01, with values from fn(dayIndex). */
function writeDays(days: number, fn: (i: number) => Record<string, number>) {
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    writeCoins(date, fn(i));
  }
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "hiveos-movers-"));
  process.env.DATA_DIR = dir;
  vi.resetModules();
  movers = await import("../movers");
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe("getMovers", () => {
  it("ranks by percentage points, so a tiny item growing a lot doesn't outrank a big mover", () => {
    // TINY: 0.01% -> 5% (+4.99 pp, +49,900%); BIG: 30% -> 38% (+8 pp, +27%)
    writeDays(31, (i) => ({ TINY: i < 15 ? 0.01 : 5, BIG: i < 15 ? 30 : 38 }));
    const { gainers } = movers.getMovers("30d", { smoothDays: 1 });
    expect(gainers.map((g) => [g.name, g.change])).toEqual([["BIG", 8], ["TINY", 4.99]]);
    expect(gainers[0].relative).toBeCloseTo(26.67, 2);
  });

  it("lists declines under losers with negative values", () => {
    writeDays(31, (i) => ({ UP: 10 + i * 0.1, DOWN: 20 - i * 0.2 }));
    const { gainers, losers } = movers.getMovers("30d", { smoothDays: 1 });
    expect(gainers.map((g) => g.name)).toEqual(["UP"]);
    expect(losers.map((l) => [l.name, l.change])).toEqual([["DOWN", -6]]);
  });

  it("only uses snapshots inside the window", () => {
    // A big move 20 days ago, flat for the last week
    writeDays(31, (i) => ({ A: i < 10 ? 1 : 40 }));
    expect(movers.getMovers("7d").gainers).toEqual([]);
    expect(movers.getMovers("30d").gainers.map((g) => g.name)).toEqual(["A"]);
  });

  it("treats a new item as starting from 0 and ignores items below the minimum share", () => {
    // NEW is absent from the first 20 snapshots entirely
    writeDays(31, (i) => ({ ...(i < 20 ? {} : { NEW: 6 }), DUST: i < 15 ? 0.1 : 0.3 }));
    const { gainers } = movers.getMovers("30d", { smoothDays: 1 });
    expect(gainers.map((g) => [g.name, g.start, g.relative])).toEqual([["NEW", 0, null]]);
  });

  it("averages several days at each end", () => {
    writeDays(31, (i) => ({ A: i === 30 ? 16 : 10 })); // one-day spike at the end
    const [a] = movers.getMovers("30d", { smoothDays: 3 }).gainers;
    expect(a.end).toBe(12); // (10 + 10 + 16) / 3
    expect(a.change).toBe(2);
  });
});
