import { NextRequest, NextResponse } from "next/server";
import { getLatestSnapshotTime } from "@/lib/data";
import { checkManualSnapshotRequest, takeSnapshot } from "@/lib/snapshot";

// Manual/external snapshot trigger. Requires `Authorization: Bearer $CRON_SECRET`
// (GET is accepted too, as Vercel Cron and most external schedulers use it).
// Daily snapshots don't need this: the built-in scheduler in instrumentation.ts takes them.
export async function POST(req: NextRequest) {
  const rejection = checkManualSnapshotRequest({
    authorization: req.headers.get("authorization"),
    secret: process.env.CRON_SECRET,
    latest: getLatestSnapshotTime(),
  });
  if (rejection) {
    return NextResponse.json({ error: rejection.error }, { status: rejection.status });
  }

  try {
    const files = await takeSnapshot();
    return NextResponse.json({ success: true, files, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export const GET = POST;
