import { connection } from "next/server";
import { AlertTriangle } from "lucide-react";
import { getLatestSnapshotTime } from "@/lib/data";
import { dataAgeHours, formatAge, formatUtc, isStale } from "@/lib/health";

/** Warns on every page when the daily snapshot has stopped arriving. */
export async function StaleDataBanner() {
  await connection(); // evaluate per request, never at build time
  const latest = getLatestSnapshotTime();
  const age = dataAgeHours(latest);
  if (!isStale(age)) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {latest && age !== null ? (
          <>
            <strong>Data is {formatAge(age).replace(" ago", " old")}</strong> (latest snapshot{" "}
            {formatUtc(latest)}). The daily snapshot may be failing: check the server logs for{" "}
            <code>[Snapshot]</code> lines or <code>/api/health</code>.
          </>
        ) : (
          <strong>No snapshots yet. The first one is taken shortly after the server starts.</strong>
        )}
      </p>
    </div>
  );
}
