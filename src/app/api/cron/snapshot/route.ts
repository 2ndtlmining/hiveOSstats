import { NextResponse } from "next/server";
import { fetchFromApi, cleanData } from "@/lib/hiveos";
import { saveSnapshot, saveRawSnapshot } from "@/lib/data";

export async function GET() {
  return handleSnapshot();
}

export async function POST() {
  return handleSnapshot();
}

async function handleSnapshot() {
  const raw = await fetchFromApi();
  if (!raw) {
    return NextResponse.json({ error: "Failed to fetch from HiveOS API" }, { status: 502 });
  }

  const rawFile = saveRawSnapshot(raw);
  const cleaned = cleanData(raw);
  const cleanedFile = saveSnapshot(cleaned);

  return NextResponse.json({
    success: true,
    files: { raw: rawFile, cleaned: cleanedFile },
    timestamp: new Date().toISOString(),
  });
}
