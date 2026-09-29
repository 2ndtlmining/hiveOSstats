import { NextResponse } from "next/server";
import { getHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/** For uptime monitors: 200 when data is fresh, 503 when snapshots have stopped. */
export async function GET() {
  let health;
  try {
    health = getHealth();
  } catch (err) {
    // Details (which include filesystem paths) go to the server log only
    console.error("[Health] Can't read snapshot data:", (err as Error).message);
    return NextResponse.json(
      { status: "error", error: "Can't read snapshot data; see the server logs" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
