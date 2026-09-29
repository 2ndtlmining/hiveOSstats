import { NextResponse } from "next/server";
import { getHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/** For uptime monitors: 200 when data is fresh, 503 when snapshots have stopped. */
export async function GET() {
  let health;
  try {
    health = getHealth();
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: `Can't read snapshot data: ${(err as Error).message}` },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
