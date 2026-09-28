/** Export metadata, safe to import from client components (no server deps). */

export type ExportType = "snapshot" | "diff" | "daily" | "monthly";

export const EXPORT_TYPES: Record<ExportType, { label: string; slug: string; description: string }> = {
  snapshot: {
    label: "Snapshot Data",
    slug: "snapshot-data",
    description: "Every item in every snapshot, one row each. Ready for your own PivotTables.",
  },
  diff: {
    label: "Differences",
    slug: "differences",
    description: "Latest vs previous snapshot, with the change in percentage points.",
  },
  daily: {
    label: "Daily Pivot",
    slug: "daily-pivot",
    description: "Items as rows, days as columns. Blank means the item wasn't in HiveOS's stats that day.",
  },
  monthly: {
    label: "Monthly Pivot",
    slug: "monthly-pivot",
    description: "Items as rows, months as columns: the average share on the days the item was present.",
  },
};

export function isExportType(value: string): value is ExportType {
  return Object.prototype.hasOwnProperty.call(EXPORT_TYPES, value);
}
