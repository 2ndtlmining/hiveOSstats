import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dir: string;

function writeRaw(date: string, asics: { name: string; amount: number }[]) {
  const empty = [{ name: "x", amount: 1 }];
  fs.writeFileSync(
    path.join(dir, `raw_data_x_${date}_06-00-00.json`),
    JSON.stringify({
      coins: empty, algos: empty, gpu_brands: empty, nvidia_models: empty,
      amd_models: empty, miners: [{ name: "xmrig-new", amount: 1 }], asic_models: asics,
    })
  );
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "hiveos-labels-"));
  process.env.DATA_DIR = dir;
  vi.resetModules();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe("display names", () => {
  it("maps cleaned keys to the original HiveOS spelling", async () => {
    writeRaw("2026-01-01", [{ name: "Antminer L3+ Hiveon", amount: 0.3 }, { name: "WhatsMiner M30S++", amount: 0.1 }]);
    const { getDisplayNames, displayName } = await import("../labels");
    expect(getDisplayNames("asic_models", ["ANTMINER L3_ HIVEON", "WHATSMINER M30S__", "UNKNOWN"])).toEqual({
      "ANTMINER L3_ HIVEON": "Antminer L3+ Hiveon",
      "WHATSMINER M30S__": "WhatsMiner M30S++",
    });
    expect(displayName("miners", "XMRIG_NEW")).toBe("xmrig-new");
    expect(displayName("asic_models", "UNKNOWN")).toBe("UNKNOWN");
  });

  it("uses the most recent spelling and reads new raw files later", async () => {
    writeRaw("2026-01-01", [{ name: "Antminer S19 hiveon", amount: 0.2 }]);
    const { displayName } = await import("../labels");
    expect(displayName("asic_models", "ANTMINER S19 HIVEON")).toBe("Antminer S19 hiveon");
    writeRaw("2026-01-02", [{ name: "Antminer S19 Hiveon", amount: 0.2 }]);
    expect(displayName("asic_models", "ANTMINER S19 HIVEON")).toBe("Antminer S19 Hiveon");
  });
});
