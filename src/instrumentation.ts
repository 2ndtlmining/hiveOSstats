export async function register() {
  // Only run the scheduler on the server (not during build or on the client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { fetchFromApi, cleanData } = await import("@/lib/hiveos");
    const { saveSnapshot, saveRawSnapshot } = await import("@/lib/data");

    // Take a snapshot every day at 06:00 UTC
    cron.default.schedule("0 6 * * *", async () => {
      console.log(`[Snapshot] Starting scheduled snapshot at ${new Date().toISOString()}`);
      try {
        const raw = await fetchFromApi();
        if (!raw) {
          console.error("[Snapshot] Failed to fetch from HiveOS API");
          return;
        }
        const rawFile = saveRawSnapshot(raw);
        const cleaned = cleanData(raw);
        const cleanedFile = saveSnapshot(cleaned);
        console.log(`[Snapshot] Saved: ${rawFile}, ${cleanedFile}`);
      } catch (err) {
        console.error("[Snapshot] Error:", err);
      }
    }, { timezone: "UTC" });

    console.log("[Snapshot] Scheduler started - daily snapshots at 06:00 UTC");
  }
}
