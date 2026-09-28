const CHECK_INTERVAL_MS = 10 * 60_000; // check every 10 minutes
const STARTUP_DELAY_MS = 30_000; // first check shortly after boot

export async function register() {
  // Only run the scheduler on the server (not during build or on the client)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guard against registering twice (e.g. dev-mode reloads)
  const g = globalThis as typeof globalThis & { __hiveSnapshotScheduler?: boolean };
  if (g.__hiveSnapshotScheduler) return;
  g.__hiveSnapshotScheduler = true;

  const { runScheduledSnapshot, DAILY_SNAPSHOT_HOUR_UTC } = await import("@/lib/snapshot");
  const { warmExportCache } = await import("@/lib/export-cache");

  // Rather than firing at an exact time (node-cron skipped the whole day if its
  // timer fired even a second late), check regularly whether a snapshot is due.
  // This also catches up after restarts and retries failed fetches.
  // Then pre-generate any Excel export that's missing for the current data,
  // so downloads are served from disk straight away.
  const check = () => void runScheduledSnapshot().then(warmExportCache);
  setTimeout(check, STARTUP_DELAY_MS);
  setInterval(check, CHECK_INTERVAL_MS);

  console.log(
    `[Snapshot] Scheduler started - daily snapshot after ${String(DAILY_SNAPSHOT_HOUR_UTC).padStart(2, "0")}:00 UTC, checked every ${CHECK_INTERVAL_MS / 60_000} min`
  );
}
