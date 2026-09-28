import fs from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { EXPORT_TYPES, isExportType } from "@/lib/export-types";
import { getExportFile } from "@/lib/export-cache";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "snapshot";
  if (!isExportType(type)) {
    return NextResponse.json(
      { error: `Invalid type. Valid: ${Object.keys(EXPORT_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  let file;
  try {
    file = await getExportFile(type);
  } catch (err) {
    console.error(`[Export] ${type} failed:`, (err as Error).message);
    return NextResponse.json({ error: "Export failed, please try again" }, { status: 500 });
  }

  const { size } = fs.statSync(file.path);
  const body = Readable.toWeb(fs.createReadStream(file.path)) as ReadableStream<Uint8Array>;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": String(size),
      "Cache-Control": "no-cache",
    },
  });
}
