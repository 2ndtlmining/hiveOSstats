import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type DataModule = typeof import("../data");

let dir: string;
let data: DataModule;

function snapshotJson(timestamp: string, xmrAmount: number) {
  const item = (name: string, amount: number) => ({ name, amount, snapshot: timestamp });
  return JSON.stringify({
    coins: { XMR: item("XMR", xmrAmount) },
    algos: { RANDOMX: item("RANDOMX", 50) },
    gpu_brands: { NVIDIA: item("NVIDIA", 90) },
    nvidia_models: {},
    amd_models: {},
    miners: {},
    asic_models: {},
  });
}

function writeCleaned(filename: string, content: string) {
  fs.writeFileSync(path.join(dir, filename), content);
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "hiveos-data-"));
  process.env.DATA_DIR = dir;
  vi.resetModules();
  data = await import("../data");
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe("snapshot file ordering", () => {
  it("orders files by the timestamp in the filename, not the month prefix", () => {
    writeCleaned("cleaned_data_sep_2026-09-30_06-00-01.json", snapshotJson("2026-09-30 06:00:01", 40));
    writeCleaned("cleaned_data_oct_2026-10-01_06-00-01.json", snapshotJson("2026-10-01 06:00:01", 41));
    writeCleaned("cleaned_data_aug_2026-08-15_06-00-01.json", snapshotJson("2026-08-15 06:00:01", 39));

    expect(data.getCleanedFiles()).toEqual([
      "cleaned_data_aug_2026-08-15_06-00-01.json",
      "cleaned_data_sep_2026-09-30_06-00-01.json",
      "cleaned_data_oct_2026-10-01_06-00-01.json",
    ]);
    expect(data.getLatestSnapshot()?.timestamp).toBe("2026-10-01 06:00:01");
  });

  it("reports the latest snapshot time from filenames", () => {
    writeCleaned("cleaned_data_sep_2026-09-30_06-00-01.json", snapshotJson("2026-09-30 06:00:01", 40));
    writeCleaned("cleaned_data_oct_2026-10-01_06-00-01.json", snapshotJson("2026-10-01 06:00:01", 41));

    expect(data.getLatestSnapshotTime()?.toISOString()).toBe("2026-10-01T06:00:01.000Z");
  });

  it("returns null latest time when there are no snapshots", () => {
    expect(data.getLatestSnapshotTime()).toBeNull();
  });
});

describe("corrupt snapshot files", () => {
  it("skips truncated or empty files instead of throwing", () => {
    writeCleaned("cleaned_data_sep_2026-09-28_06-00-01.json", snapshotJson("2026-09-28 06:00:01", 40));
    writeCleaned("cleaned_data_sep_2026-09-29_06-00-01.json", '{"coins": {');
    writeCleaned("cleaned_data_sep_2026-09-30_06-00-01.json", "");
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(data.readAllSnapshots()).toHaveLength(1);
    expect(data.getLatestSnapshot()?.timestamp).toBe("2026-09-28 06:00:01");
  });

  it("uses the newest snapshot that has items when the newest file is empty", () => {
    writeCleaned("cleaned_data_sep_2026-09-28_06-00-01.json", snapshotJson("2026-09-28 06:00:01", 40));
    writeCleaned("cleaned_data_sep_2026-09-29_06-00-01.json", "{}");

    expect(data.getLatestSnapshot()?.timestamp).toBe("2026-09-28 06:00:01");
  });
});

describe("saving snapshots", () => {
  it("writes the file atomically and leaves no temp files behind", () => {
    const filename = data.saveSnapshot(JSON.parse(snapshotJson("2026-09-30 06:00:01", 40)));

    const files = fs.readdirSync(dir);
    expect(files).toEqual([filename]);
    expect(JSON.parse(fs.readFileSync(path.join(dir, filename), "utf-8")).coins.XMR.amount).toBe(40);
  });

  it("treats a snapshot saved in October as newer than September ones", () => {
    vi.useFakeTimers({ now: new Date("2026-10-01T06:00:05Z"), toFake: ["Date"] });
    try {
      writeCleaned("cleaned_data_sep_2026-09-30_06-00-01.json", snapshotJson("2026-09-30 06:00:01", 40));
      const filename = data.saveSnapshot(JSON.parse(snapshotJson("2026-10-01 06:00:05", 41)));

      expect(filename).toBe("cleaned_data_oct_2026-10-01_06-00-05.json");
      expect(data.getCleanedFiles().at(-1)).toBe(filename);
      expect(data.getLatestSnapshot()?.timestamp).toBe("2026-10-01 06:00:05");
    } finally {
      vi.useRealTimers();
    }
  });
});

/** Write a snapshot whose coins are the given name -> amount map. */
function writeCoins(date: string, coins: Record<string, number>) {
  const snapshot = `${date} 06:00:00`;
  const items = Object.fromEntries(
    Object.entries(coins).map(([name, amount]) => [name, { name, amount, snapshot }])
  );
  writeCleaned(
    `cleaned_data_x_${date}_06-00-00.json`,
    JSON.stringify({
      coins: items, algos: {}, gpu_brands: {}, nvidia_models: {},
      amd_models: {}, miners: {}, asic_models: {},
    })
  );
}

describe("time series", () => {
  beforeEach(() => {
    writeCoins("2026-01-01", { XMR: 50 });
    writeCoins("2026-01-02", { XMR: 40, NEW: 10 });
    writeCoins("2026-01-03", { XMR: 45, NEW: 5 });
    writeCoins("2026-01-04", { XMR: 60 });
  });

  it("does not invent values before an item appeared or after it disappeared", () => {
    const series = data.getTimeSeries("coins", ["NEW"]);
    expect(series.map((p) => p.date)).toEqual([
      "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04",
    ]);
    expect(series.map((p) => p.NEW)).toEqual([undefined, 10, 5, undefined]);
  });

  it("keeps values for items present on every day", () => {
    const series = data.getTimeSeries("coins", ["XMR"]);
    expect(series.map((p) => p.XMR)).toEqual([50, 40, 45, 60]);
  });
});

describe("snapshot diff", () => {
  it("compares the latest snapshot with the previous one", () => {
    writeCoins("2026-01-01", { OLD: 3, A: 1 });
    writeCoins("2026-01-02", { A: 1, B: 4 });
    writeCoins("2026-01-03", { A: 2, C: 5 });

    const diff = data.getSnapshotDiff("coins");
    expect(diff.previousDate).toBe("2026-01-02 06:00:00");
    expect(diff.latestDate).toBe("2026-01-03 06:00:00");
    // Sorted by size of change; OLD is in neither snapshot so it's left out
    expect(diff.rows).toEqual([
      { name: "C", previous: 0, latest: 5, change: 5, status: "new" },
      { name: "B", previous: 4, latest: 0, change: -4, status: "dropped" },
      { name: "A", previous: 1, latest: 2, change: 1, status: "" },
    ]);
  });

  it("returns no rows when there is only one snapshot", () => {
    writeCoins("2026-01-01", { A: 1 });
    expect(data.getSnapshotDiff("coins").rows).toEqual([]);
  });
});

describe("incremental loading", () => {
  it("parses each file once and only reads new files after that", () => {
    writeCoins("2026-01-01", { XMR: 50 });
    writeCoins("2026-01-02", { XMR: 40 });
    const read = vi.spyOn(fs, "readFileSync");

    expect(data.getTimeSeries("coins", ["XMR"])).toHaveLength(2);
    expect(read).toHaveBeenCalledTimes(2);

    data.getTimeSeries("coins", ["XMR"]);
    expect(read).toHaveBeenCalledTimes(2); // unchanged files aren't re-read

    writeCoins("2026-01-03", { XMR: 45 });
    expect(data.getTimeSeries("coins", ["XMR"]).map((p) => p.XMR)).toEqual([50, 40, 45]);
    expect(read).toHaveBeenCalledTimes(3); // only the new file

    fs.rmSync(path.join(dir, "cleaned_data_x_2026-01-01_06-00-00.json"));
    expect(data.getTimeSeries("coins", ["XMR"]).map((p) => p.date)).toEqual(["2026-01-02", "2026-01-03"]);
    read.mockRestore();
  });
});

describe("item catalog", () => {
  it("lists active items by current share, then dropped items by last seen", () => {
    writeCoins("2026-01-01", { GONE_EARLY: 9, GONE_LATE: 1, A: 5 });
    writeCoins("2026-01-02", { GONE_LATE: 2, A: 5, B: 7 });
    writeCoins("2026-01-03", { A: 6, B: 3 });
    expect(data.getItemCatalog("coins")).toEqual([
      { name: "A", current: 6, lastSeen: "2026-01-03", peak: 6 },
      { name: "B", current: 3, lastSeen: "2026-01-03", peak: 7 },
      { name: "GONE_LATE", current: null, lastSeen: "2026-01-02", peak: 2 },
      { name: "GONE_EARLY", current: null, lastSeen: "2026-01-01", peak: 9 },
    ]);
  });
});

describe("ranged series", () => {
  it("counts the range back from the latest snapshot, not from today", async () => {
    for (let i = 0; i < 100; i++) {
      writeCoins(new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10), { A: i });
    }
    const { getRangedSeries } = await import("../series");
    const r = getRangedSeries("coins", ["A"], "30d");
    expect(r).toMatchObject({ resolution: "daily", from: "2025-03-11", to: "2025-04-10" });
    expect(r.points).toHaveLength(31);
    expect(getRangedSeries("coins", ["A"], "all").points).toHaveLength(100);
  });

  it("switches to weekly means for more than 400 days", async () => {
    for (let i = 0; i < 420; i++) {
      writeCoins(new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), { A: 1 });
    }
    const { getRangedSeries } = await import("../series");
    const all = getRangedSeries("coins", ["A"], "all");
    expect(all.resolution).toBe("weekly");
    expect(all.points.length).toBeLessThan(62);
    expect(getRangedSeries("coins", ["A"], "1y").resolution).toBe("daily");
  });
});
