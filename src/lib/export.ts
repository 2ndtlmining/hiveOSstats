import ExcelJS from "exceljs";
import type { CategoryKey } from "@/types";
import { getCategoryData, getSnapshotDiff, getTimeSeries, getUniqueNames } from "./data";
import { CATEGORY_LABELS } from "@/types";

const ALL_CATEGORIES: CategoryKey[] = [
  "coins", "algos", "gpu_brands", "nvidia_models", "amd_models", "miners", "asic_models",
];

export async function generateSnapshotExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const cat of ALL_CATEGORIES) {
    const items = getCategoryData(cat);
    const sheet = workbook.addWorksheet(CATEGORY_LABELS[cat]);
    sheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Amount (%)", key: "amount", width: 15 },
      { header: "Snapshot", key: "snapshot", width: 25 },
    ];
    for (const item of items) {
      sheet.addRow(item);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function generateDiffExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const cat of ALL_CATEGORIES) {
    const { previousDate, latestDate, rows } = getSnapshotDiff(cat);
    const sheet = workbook.addWorksheet(`${CATEGORY_LABELS[cat]} Diff`);
    sheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: `Previous (%) ${previousDate ?? ""}`.trim(), key: "previous", width: 28 },
      { header: `Latest (%) ${latestDate ?? ""}`.trim(), key: "latest", width: 28 },
      { header: "Change (pp)", key: "change", width: 14 },
      { header: "Status", key: "status", width: 10 },
    ];
    sheet.addRows(rows);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function generateDailyPivotExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const cat of ALL_CATEGORIES) {
    const names = getUniqueNames(cat);
    if (names.length === 0) continue;

    const series = getTimeSeries(cat, names);
    const sheet = workbook.addWorksheet(`${CATEGORY_LABELS[cat]} Pivot`);

    const dates = series.map((s) => s.date);
    sheet.columns = [
      { header: "Name", key: "name", width: 30 },
      ...dates.map((d) => ({ header: d, key: d, width: 15 })),
    ];

    for (const name of names) {
      const row: Record<string, string | number> = { name };
      for (const point of series) {
        row[point.date] = (point[name] as number) ?? "";
      }
      sheet.addRow(row);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function generateMonthlyPivotExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const cat of ALL_CATEGORIES) {
    const names = getUniqueNames(cat);
    if (names.length === 0) continue;

    const series = getTimeSeries(cat, names);
    const sheet = workbook.addWorksheet(`${CATEGORY_LABELS[cat]} Monthly`);

    // Aggregate to monthly
    const monthlyData: Record<string, Record<string, number[]>> = {};
    for (const point of series) {
      const month = point.date.slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = {};
      for (const name of names) {
        const val = point[name] as number | undefined;
        if (val !== undefined) {
          if (!monthlyData[month][name]) monthlyData[month][name] = [];
          monthlyData[month][name].push(val);
        }
      }
    }

    const months = Object.keys(monthlyData).sort();
    sheet.columns = [
      { header: "Name", key: "name", width: 30 },
      ...months.map((m) => ({ header: m, key: m, width: 15 })),
    ];

    for (const name of names) {
      const row: Record<string, string | number> = { name };
      for (const month of months) {
        const vals = monthlyData[month]?.[name];
        row[month] = vals && vals.length > 0
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
          : "";
      }
      sheet.addRow(row);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
