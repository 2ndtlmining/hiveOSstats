import ExcelJS from "exceljs";
import type { CategoryKey, DataItem } from "@/types";
import { getCategoryData, getTimeSeries, getUniqueNames } from "./data";
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
    const items = getCategoryData(cat);
    const sheet = workbook.addWorksheet(`${CATEGORY_LABELS[cat]} Diff`);
    sheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Difference", key: "diff", width: 15 },
    ];

    // Group by name, sort by snapshot, get diff of last two
    const byName: Record<string, DataItem[]> = {};
    for (const item of items) {
      if (!byName[item.name]) byName[item.name] = [];
      byName[item.name].push(item);
    }

    for (const [name, records] of Object.entries(byName)) {
      records.sort((a, b) => a.snapshot.localeCompare(b.snapshot));
      const diff = records.length >= 2
        ? records[records.length - 1].amount - records[records.length - 2].amount
        : null;
      sheet.addRow({ name, diff: diff !== null ? Math.round(diff * 100) / 100 : "N/A" });
    }
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
