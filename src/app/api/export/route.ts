import { NextRequest, NextResponse } from "next/server";
import {
  generateSnapshotExcel,
  generateDiffExcel,
  generateDailyPivotExcel,
  generateMonthlyPivotExcel,
} from "@/lib/export";

const GENERATORS: Record<string, { fn: () => Promise<Buffer>; filename: string }> = {
  snapshot: { fn: generateSnapshotExcel, filename: "snapshot_output.xlsx" },
  diff: { fn: generateDiffExcel, filename: "differences_output.xlsx" },
  daily: { fn: generateDailyPivotExcel, filename: "pivot_daily_output.xlsx" },
  monthly: { fn: generateMonthlyPivotExcel, filename: "pivot_monthly_output.xlsx" },
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "snapshot";
  const gen = GENERATORS[type];

  if (!gen) {
    return NextResponse.json(
      { error: `Invalid type. Valid: ${Object.keys(GENERATORS).join(", ")}` },
      { status: 400 }
    );
  }

  const buffer = await gen.fn();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${gen.filename}"`,
    },
  });
}
