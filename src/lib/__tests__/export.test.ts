import fs from "fs";
import os from "os";
import path from "path";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CacheModule = typeof import("../export-cache");

let dataDir: string;
let cacheDir: string;
let cache: CacheModule;

function writeCoins(date: string, coins: Record<string, number>) {
  const snapshot = `${date} 06:00:00`;
  const items = Object.fromEntries(
    Object.entries(coins).map(([name, amount]) => [name, { name, amount, snapshot }])
  );
  fs.writeFileSync(
    path.join(dataDir, `cleaned_data_x_${date}_06-00-00.json`),
    JSON.stringify({
      coins: items, algos: {}, gpu_brands: {}, nvidia_models: {},
      amd_models: {}, miners: {}, asic_models: {},
    })
  );
}

async function readWorkbook(file: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return wb;
}

/** Row values without ExcelJS's leading empty slot. */
function rowValues(sheet: ExcelJS.Worksheet, n: number) {
  return (sheet.getRow(n).values as ExcelJS.CellValue[]).slice(1);
}

beforeEach(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "hiveos-data-"));
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "hiveos-exports-"));
  process.env.DATA_DIR = dataDir;
  process.env.EXPORT_CACHE_DIR = cacheDir;
  vi.resetModules();
  cache = await import("../export-cache");

  writeCoins("2026-01-01", { OLD: 30, XMR: 50.004 });
  writeCoins("2026-01-02", { XMR: 40, NEW: 10 });
  writeCoins("2026-01-03", { XMR: 45, NEW: 55 });
});

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(cacheDir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
  delete process.env.EXPORT_CACHE_DIR;
});

describe("daily pivot export", () => {
  it("uses real dates, leaves absent days blank and puts the largest current items first", async () => {
    const file = await cache.getExportFile("daily");
    expect(file.filename).toBe("hiveos-daily-pivot_2026-01-03.xlsx");

    const sheet = (await readWorkbook(file.path)).getWorksheet("Coins Pivot")!;
    const header = rowValues(sheet, 1);
    expect(header[0]).toBe("Name");
    expect(header[1]).toBe("Display name");
    expect(header[2]).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(sheet.getRow(1).getCell(3).numFmt).toBe("yyyy-mm-dd");

    // NEW (55) and XMR (45) are in the latest snapshot; OLD dropped out
    expect(rowValues(sheet, 2)).toEqual(["NEW", "NEW", undefined, 10, 55]);
    expect(rowValues(sheet, 3)).toEqual(["XMR", "XMR", 50, 40, 45]);
    expect(rowValues(sheet, 4)[0]).toBe("OLD");

    expect(sheet.views[0]).toMatchObject({ state: "frozen", xSplit: 2, ySplit: 1 });
  });
});

describe("snapshot data export", () => {
  it("stores snapshot times as dates and rounds amounts", async () => {
    const wb = await readWorkbook((await cache.getExportFile("snapshot")).path);
    const sheet = wb.getWorksheet("Coins")!;
    expect(rowValues(sheet, 1)).toEqual(["Name", "Amount (%)", "Snapshot (UTC)"]);
    const xmr = rowValues(sheet, 3);
    expect(xmr).toEqual(["XMR", 50, new Date("2026-01-01T06:00:00Z")]);
    expect(wb.getWorksheet("About")).toBeDefined();
  });
});

describe("export cache", () => {
  it("generates once per data version and serves the cached file after that", async () => {
    const first = await cache.getExportFile("diff");
    const mtime = fs.statSync(first.path).mtimeMs;
    const again = await cache.getExportFile("diff");
    expect(again.path).toBe(first.path);
    expect(fs.statSync(again.path).mtimeMs).toBe(mtime);
  });

  it("shares one generation between concurrent requests", async () => {
    const [a, b] = await Promise.all([cache.getExportFile("monthly"), cache.getExportFile("monthly")]);
    expect(a.path).toBe(b.path);
    expect(fs.readdirSync(cacheDir).filter((f) => f.startsWith("monthly_"))).toHaveLength(1);
  });

  it("regenerates after a new snapshot and removes the old file", async () => {
    const before = await cache.getExportFile("diff");
    writeCoins("2026-01-04", { XMR: 100 });
    const after = await cache.getExportFile("diff");
    expect(after.path).not.toBe(before.path);
    expect(fs.existsSync(before.path)).toBe(false);
    expect(fs.readdirSync(cacheDir)).toEqual([path.basename(after.path)]);
  });
});
