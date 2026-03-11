import { NextResponse } from "next/server";
import { fetchFromApi } from "@/lib/hiveos";

export async function GET() {
  const data = await fetchFromApi();
  if (!data) {
    return NextResponse.json({ error: "Failed to fetch from HiveOS API" }, { status: 502 });
  }
  return NextResponse.json(data);
}
