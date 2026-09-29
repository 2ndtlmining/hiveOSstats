import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RawSnapshot } from "@/types";

type SnapshotModule = typeof import("../snapshot");

let dir: string;
let snap: SnapshotModule;

function validRaw(): RawSnapshot {
  const list = (name: string) => [{ name, amount: 0.6 }, { name: `${name}-2`, amount: 0.4 }];
  return {
    coins: list("XMR"),
    algos: list("randomx"),
    gpu_brands: list("nvidia"),
    nvidia_models: list("CMP 50HX 10GB"),
    amd_models: list("Radeon RX 5700 XT 8GB"),
    miners: list("xmrig-new"),
    asic_models: list("Antminer S19JPRO Hiveon"),
  };
}

const files = (prefix: string) => fs.readdirSync(dir).filter((f) => f.startsWith(prefix));
const at = (iso: string) => new Date(iso);

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "hiveos-snap-"));
  process.env.DATA_DIR = dir;
  vi.resetModules();
  snap = await import("../snapshot");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe("isSnapshotDue (daily at 06:00 UTC)", () => {
  it("is due when there are no snapshots", () => {
    expect(snap.isSnapshotDue(null, at("2026-09-26T07:00:00Z"))).toBe(true);
  });

  it("is not due once today's 06:00 snapshot exists", () => {
    expect(snap.isSnapshotDue(at("2026-09-26T06:00:01Z"), at("2026-09-26T07:00:00Z"))).toBe(false);
  });

  it("is due after 06:00 when the latest snapshot is from yesterday", () => {
    expect(snap.isSnapshotDue(at("2026-09-25T06:00:01Z"), at("2026-09-26T06:00:00Z"))).toBe(true);
  });

  it("is not due before 06:00 when yesterday's snapshot exists", () => {
    expect(snap.isSnapshotDue(at("2026-09-25T06:00:01Z"), at("2026-09-26T05:59:00Z"))).toBe(false);
  });

  it("is due before 06:00 when yesterday's snapshot was missed", () => {
    expect(snap.isSnapshotDue(at("2026-09-24T06:00:01Z"), at("2026-09-26T05:00:00Z"))).toBe(true);
  });
});

describe("takeSnapshot", () => {
  it("saves raw and cleaned files for a valid response", async () => {
    const result = await snap.takeSnapshot(async () => validRaw());

    expect(files("cleaned_data")).toEqual([result.cleaned]);
    expect(files("raw_data")).toEqual([result.raw]);
  });

  it("rejects an invalid response, keeping it only as a rejected file", async () => {
    const bad = { ...validRaw(), coins: [] } as unknown as RawSnapshot;

    await expect(snap.takeSnapshot(async () => bad)).rejects.toThrow(/coins: expected a non-empty array/);
    expect(files("cleaned_data")).toEqual([]);
    expect(files("raw_data")).toEqual([]);
    expect(files("rejected_raw_data")).toHaveLength(1);
  });

  it("throws and saves nothing when the API fetch fails", async () => {
    await expect(snap.takeSnapshot(async () => null)).rejects.toThrow(/fetch/i);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe("runScheduledSnapshot", () => {
  it("takes a snapshot when one is due", async () => {
    expect(await snap.runScheduledSnapshot({ fetchRaw: async () => validRaw() })).toBe("taken");
    expect(files("cleaned_data")).toHaveLength(1);
  });

  it("does not take a second snapshot for the same period", async () => {
    const fetchRaw = vi.fn(async () => validRaw());

    await snap.runScheduledSnapshot({ fetchRaw });
    expect(await snap.runScheduledSnapshot({ fetchRaw })).toBe("skipped");
    expect(fetchRaw).toHaveBeenCalledTimes(1);
    expect(files("cleaned_data")).toHaveLength(1);
  });

  it("reports failure without throwing, then succeeds on the next run", async () => {
    expect(await snap.runScheduledSnapshot({ fetchRaw: async () => null })).toBe("failed");
    expect(await snap.runScheduledSnapshot({ fetchRaw: async () => validRaw() })).toBe("taken");
    expect(files("cleaned_data")).toHaveLength(1);
  });

  it("doesn't start a second run while one is in progress", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const fetchRaw = vi.fn(async () => {
      await gate;
      return validRaw();
    });

    const first = snap.runScheduledSnapshot({ fetchRaw });
    const second = await snap.runScheduledSnapshot({ fetchRaw });
    release();

    expect(second).toBe("busy");
    expect(await first).toBe("taken");
    expect(fetchRaw).toHaveBeenCalledTimes(1);
  });
});

describe("checkManualSnapshotRequest", () => {
  const now = at("2026-09-26T12:00:00Z");
  const hourAgo = at("2026-09-26T11:00:00Z");
  const check = (authorization: string | null, secret: string | undefined, latest: Date | null = hourAgo) =>
    snap.checkManualSnapshotRequest({ authorization, secret, latest, now });

  it("is disabled (503) when no CRON_SECRET is configured", () => {
    expect(check("Bearer anything", undefined)?.status).toBe(503);
    expect(check("Bearer ", "")?.status).toBe(503);
  });

  it("rejects (401) a missing or wrong bearer token", () => {
    expect(check(null, "s3cret")?.status).toBe(401);
    expect(check("Bearer wrong", "s3cret")?.status).toBe(401);
    expect(check("s3cret", "s3cret")?.status).toBe(401);
  });

  it("rate-limits (429) when a snapshot was taken in the last 15 minutes", () => {
    expect(check("Bearer s3cret", "s3cret", at("2026-09-26T11:50:00Z"))?.status).toBe(429);
  });

  it("allows an authorised request when the last snapshot is older", () => {
    expect(check("Bearer s3cret", "s3cret")).toBeNull();
    expect(check("Bearer s3cret", "s3cret", null)).toBeNull();
  });
});

describe("health", () => {
  beforeEach(() => {
    delete (globalThis as { __hiveSchedulerStatus?: unknown }).__hiveSchedulerStatus;
  });

  it("records scheduler failures and successes for /api/health", async () => {
    const health = await import("../health");
    await snap.runScheduledSnapshot({ fetchRaw: async () => null, now: at("2026-01-02T07:00:00Z") });
    expect(health.schedulerStatus()).toMatchObject({
      lastResult: "failed",
      lastError: "Failed to fetch from HiveOS API",
      lastSuccessAt: null,
    });

    await snap.runScheduledSnapshot({ fetchRaw: async () => validRaw(), now: at("2026-01-02T07:10:00Z") });
    expect(health.schedulerStatus()).toMatchObject({
      lastResult: "taken",
      lastSuccessAt: "2026-01-02T07:10:00.000Z",
      lastError: "Failed to fetch from HiveOS API", // kept for diagnosis
    });
  });

  it("is stale with no data or data older than 30 hours", async () => {
    const health = await import("../health");
    expect(health.getHealth().status).toBe("stale");

    await snap.takeSnapshot(async () => validRaw());
    const now = new Date();
    expect(health.getHealth(now).status).toBe("ok");
    expect(health.getHealth(new Date(now.getTime() + 31 * 3_600_000))).toMatchObject({
      status: "stale",
      ageHours: 31,
    });
  });

  it("pings the healthcheck URL after a successful snapshot only", async () => {
    process.env.HEALTHCHECK_PING_URL = "https://hc.example/ping";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    try {
      await snap.runScheduledSnapshot({ fetchRaw: async () => null });
      expect(fetchSpy).not.toHaveBeenCalled();
      await snap.runScheduledSnapshot({ fetchRaw: async () => validRaw() });
      expect(fetchSpy).toHaveBeenCalledWith("https://hc.example/ping", expect.anything());
    } finally {
      delete process.env.HEALTHCHECK_PING_URL;
    }
  });
});

describe("formatAge", () => {
  it("reads naturally", async () => {
    const { formatAge } = await import("../health");
    expect(formatAge(0.5)).toBe("less than an hour ago");
    expect(formatAge(1.2)).toBe("1 hour ago");
    expect(formatAge(14.9)).toBe("14 hours ago");
    expect(formatAge(72)).toBe("3 days ago");
  });
});
