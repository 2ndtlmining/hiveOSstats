import { NextRequest, NextResponse } from "next/server";
import { getCategoryData, getTimeSeries, getUniqueNames, getLatestSnapshot, getSnapshotCount } from "@/lib/data";
import type { CategoryKey } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") as CategoryKey | null;
  const names = searchParams.get("names"); // comma-separated
  const action = searchParams.get("action");

  if (action === "summary") {
    const latest = getLatestSnapshot();
    return NextResponse.json({
      snapshotCount: getSnapshotCount(),
      latestTimestamp: latest?.timestamp ?? null,
    });
  }

  if (action === "names" && category) {
    return NextResponse.json(getUniqueNames(category));
  }

  if (action === "latest") {
    const latest = getLatestSnapshot();
    if (!latest) return NextResponse.json({ error: "No data" }, { status: 404 });
    if (category) {
      return NextResponse.json(latest.data[category] ?? {});
    }
    return NextResponse.json(latest);
  }

  if (!category) {
    return NextResponse.json({ error: "category param required" }, { status: 400 });
  }

  if (names) {
    const nameList = names.split(",").map((n) => n.trim());
    const series = getTimeSeries(category, nameList);
    return NextResponse.json(series);
  }

  return NextResponse.json(getCategoryData(category));
}
