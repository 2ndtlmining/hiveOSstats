import { getLatestSnapshotTime, getSnapshotCount } from "./data";

/** Data older than this means scheduled snapshots have stopped working. */
export const STALE_AFTER_HOURS = 30;

export interface SchedulerStatus {
  lastRunAt: string | null;
  lastResult: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

// Kept on globalThis: the scheduler (instrumentation) and route handlers can
// be separate bundles with their own copies of this module.
const g = globalThis as typeof globalThis & { __hiveSchedulerStatus?: SchedulerStatus };

export function schedulerStatus(): SchedulerStatus {
  g.__hiveSchedulerStatus ??= {
    lastRunAt: null, lastResult: null, lastSuccessAt: null, lastError: null, lastErrorAt: null,
  };
  return g.__hiveSchedulerStatus;
}

export function recordSchedulerRun(result: string, now: Date, error?: string) {
  const status = schedulerStatus();
  status.lastRunAt = now.toISOString();
  status.lastResult = result;
  if (result === "taken") status.lastSuccessAt = status.lastRunAt;
  if (error) {
    status.lastError = error;
    status.lastErrorAt = status.lastRunAt;
  }
}

export function dataAgeHours(latest: Date | null, now = new Date()): number | null {
  return latest ? (now.getTime() - latest.getTime()) / 3_600_000 : null;
}

export function isStale(ageHours: number | null): boolean {
  return ageHours === null || ageHours > STALE_AFTER_HOURS;
}

export function getHealth(now = new Date()) {
  const latest = getLatestSnapshotTime();
  const ageHours = dataAgeHours(latest, now);
  return {
    status: isStale(ageHours) ? ("stale" as const) : ("ok" as const),
    snapshotCount: getSnapshotCount(),
    latestSnapshot: latest?.toISOString() ?? null,
    ageHours: ageHours === null ? null : Math.round(ageHours * 10) / 10,
    staleAfterHours: STALE_AFTER_HOURS,
    scheduler: schedulerStatus(),
    uptimeSec: Math.round(process.uptime()),
  };
}

/** "3 hours ago", "2 days ago". */
export function formatAge(ageHours: number): string {
  if (ageHours < 1) return "less than an hour ago";
  if (ageHours < 48) return `${Math.floor(ageHours)} hour${Math.floor(ageHours) === 1 ? "" : "s"} ago`;
  return `${Math.floor(ageHours / 24)} days ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "28 Sep 2026, 06:01 UTC" (built by hand: locale data varies, e.g. "Sept"). */
export function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}
