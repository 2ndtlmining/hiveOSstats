import { NextRequest, NextResponse } from "next/server";
import { getCategoryData, getTimeSeries, getUniqueNames, getLatestSnapshot, getSnapshotCount } from "@/lib/data";
import type { CategoryKey } from "@/types";

function jsonResponse(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") as CategoryKey | null;
  const names = searchParams.get("names"); // comma-separated
  const action = searchParams.get("action");

  if (action === "summary") {
    const latest = getLatestSnapshot();
    return jsonResponse({
      snapshotCount: getSnapshotCount(),
      latestTimestamp: latest?.timestamp ?? null,
    });
  }

  if (action === "names" && category) {
    return jsonResponse(getUniqueNames(category));
  }

  if (action === "latest") {
    const latest = getLatestSnapshot();
    if (!latest) return NextResponse.json({ error: "No data" }, { status: 404 });
    if (category) {
      return jsonResponse(latest.data[category] ?? {});
    }
    return jsonResponse(latest);
  }

  if (!category) {
    return NextResponse.json({ error: "category param required" }, { status: 400 });
  }

  if (names) {
    const nameList = names.split(",").map((n) => n.trim());
    const series = getTimeSeries(category, nameList);
    return jsonResponse(series);
  }

  return jsonResponse(getCategoryData(category));
}
