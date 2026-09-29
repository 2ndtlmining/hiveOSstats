import { timingSafeEqual } from "crypto";
import { fetchFromApi, cleanData, validateRawSnapshot } from "./hiveos";
import { getLatestSnapshotTime, saveSnapshot, saveRawSnapshot, saveRejectedRawSnapshot } from "./data";
import { recordSchedulerRun } from "./health";
import type { RawSnapshot } from "@/types";

/** One snapshot per day, taken at or soon after this hour (UTC). */
export const DAILY_SNAPSHOT_HOUR_UTC = 6;

type FetchRaw = () => Promise<RawSnapshot | null>;

/**
 * A snapshot is due when none has been taken since the most recent
 * 06:00 UTC. State-based rather than time-triggered, so a late timer,
 * a restart or a failed fetch is simply picked up on the next check.
 */
export function isSnapshotDue(latest: Date | null, now: Date): boolean {
  if (!latest) return true;
  const lastScheduled = new Date(now);
  lastScheduled.setUTCHours(DAILY_SNAPSHOT_HOUR_UTC, 0, 0, 0);
  if (lastScheduled > now) lastScheduled.setUTCDate(lastScheduled.getUTCDate() - 1);
  return latest < lastScheduled;
}

/** Fetch, validate and save one snapshot. Throws if anything fails. */
export async function takeSnapshot(fetchRaw: FetchRaw = fetchFromApi): Promise<{ raw: string; cleaned: string }> {
  const data = await fetchRaw();
  if (!data) throw new Error("Failed to fetch from HiveOS API");

  const errors = validateRawSnapshot(data);
  if (errors.length > 0) {
    const rejected = saveRejectedRawSnapshot(data);
    throw new Error(`Invalid HiveOS API response (saved as ${rejected}): ${errors.slice(0, 5).join("; ")}`);
  }

  const raw = saveRawSnapshot(data);
  const cleaned = saveSnapshot(cleanData(data));
  return { raw, cleaned };
}

let running = false;

export type ScheduledRunResult = "taken" | "skipped" | "failed" | "busy";

/** Take a snapshot if one is due. Safe to call often; never throws. */
export async function runScheduledSnapshot(
  { fetchRaw = fetchFromApi, now = new Date() }: { fetchRaw?: FetchRaw; now?: Date } = {}
): Promise<ScheduledRunResult> {
  if (running) return "busy";
  running = true;
  try {
    if (!isSnapshotDue(getLatestSnapshotTime(), now)) {
      recordSchedulerRun("skipped", now);
      return "skipped";
    }

    console.log(`[Snapshot] Snapshot due, taking one at ${now.toISOString()}`);
    const { raw, cleaned } = await takeSnapshot(fetchRaw);
    console.log(`[Snapshot] Saved: ${raw}, ${cleaned}`);
    recordSchedulerRun("taken", now);
    await pingHealthcheck();
    return "taken";
  } catch (err) {
    const message = (err as Error).message;
    console.error("[Snapshot] Failed, will retry on the next check:", message);
    recordSchedulerRun("failed", now, message);
    return "failed";
  } finally {
    running = false;
  }
}

/**
 * Optional dead man's switch: ping HEALTHCHECK_PING_URL (e.g. Healthchecks.io)
 * after each successful snapshot, so a *missed* day raises an alert even while
 * the site is up. Never throws.
 */
async function pingHealthcheck() {
  const url = process.env.HEALTHCHECK_PING_URL;
  if (!url) return;
  try {
    await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    console.error("[Snapshot] Healthcheck ping failed:", (err as Error).message);
  }
}

/** Minimum gap between manually triggered snapshots. */
export const MANUAL_SNAPSHOT_MIN_INTERVAL_MS = 15 * 60_000;

/**
 * Gatekeeper for the manual snapshot endpoint. Returns an HTTP error to send,
 * or null if the request may proceed.
 */
export function checkManualSnapshotRequest({
  authorization,
  secret,
  latest,
  now = new Date(),
}: {
  authorization: string | null;
  secret: string | undefined;
  latest: Date | null;
  now?: Date;
}): { status: number; error: string } | null {
  if (!secret) {
    return { status: 503, error: "Manual snapshots are disabled: set CRON_SECRET to enable them" };
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { status: 401, error: "Unauthorized" };
  }

  if (latest && now.getTime() - latest.getTime() < MANUAL_SNAPSHOT_MIN_INTERVAL_MS) {
    return { status: 429, error: "A snapshot was taken less than 15 minutes ago" };
  }
  return null;
}
