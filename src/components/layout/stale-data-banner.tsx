import { connection } from "next/server";
import { AlertTriangle } from "lucide-react";
import { getLatestSnapshotTime } from "@/lib/data";
import { dataAgeHours, formatAge, formatUtc, isStale } from "@/lib/health";

/** Warns on every page when the daily snapshot has stopped arriving. */
export async function StaleDataBanner() {
  await connection(); // evaluate per request, never at build time

  // Part of the layout: if the data can't be read, warn instead of throwing,
  // so the page's own error boundary can still render inside the app shell
  let latest: Date | null;
  try {
    latest = getLatestSnapshotTime();
  } catch (err) {
    console.error("[Data] Can't read the snapshot directory:", (err as Error).message);
    return (
      <Banner>
        <strong>Snapshot data can&apos;t be read.</strong> Check that the data directory exists and
        is readable by the app (see <code>/api/health</code> and the server logs).
      </Banner>
    );
  }
  const age = dataAgeHours(latest);
  if (!isStale(age)) return null;

  return (
    <Banner>
      {latest && age !== null ? (
        <>
          <strong>Data is {formatAge(age).replace(" ago", " old")}</strong> (latest snapshot{" "}
          {formatUtc(latest)}). The daily snapshot may be failing: check the server logs for{" "}
          <code>[Snapshot]</code> lines or <code>/api/health</code>.
        </>
      ) : (
        <strong>No snapshots yet. The first one is taken shortly after the server starts.</strong>
      )}
    </Banner>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
