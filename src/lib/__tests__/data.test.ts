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
