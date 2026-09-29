import ExcelJS from "exceljs";
import type { Writable } from "stream";
import type { CategoryKey, TimeSeriesPoint } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { EXPORT_TYPES, type ExportType } from "./export-types";
import { getDisplayNames } from "./labels";
import {
  getCategoryData,
  getLatestSnapshot,
  getSnapshotCount,
  getSnapshotDiff,
  getTimeSeries,
  getUniqueNames,
} from "./data";

const ALL_CATEGORIES: CategoryKey[] = [
  "coins", "algos", "gpu_brands", "nvidia_models", "amd_models", "miners", "asic_models",
];

const PCT_FORMAT = "0.00";
const HEADER_FONT = { bold: true };
/** Yield to the event loop after this many cells, so an export never stalls other requests. */
const CELLS_PER_YIELD = 10_000;

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "2024-05-26 10:26:26" (UTC) -> a Date that Excel shows as that same wall time. */
function snapshotDate(timestamp: string): Date {
  return new Date(`${timestamp.replace(" ", "T")}Z`);
}

/** "2024-05-26" or "2024-05" -> a UTC Date for use as an Excel date. */
function dayOrMonthDate(value: string): Date {
  return new Date(`${value.length === 7 ? `${value}-01` : value}T00:00:00Z`);
}

function newWorkbook(stream: Writable) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: false,
  });
  workbook.creator = "HiveOS Stats";
  workbook.created = new Date();
  return workbook;
}

/** A worksheet with a frozen, filterable header row. */
function addSheet(
  workbook: ExcelJS.stream.xlsx.WorkbookWriter,
  name: string,
  columnCount: number,
  frozenColumns = 1
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", xSplit: frozenColumns, ySplit: 1 }],
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnCount } };
  return sheet;
}

function commitHeader(sheet: ExcelJS.Worksheet, values: (string | Date)[], dateFormat?: string) {
  const row = sheet.addRow(values);
  row.font = HEADER_FONT;
  if (dateFormat) {
    row.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = dateFormat;
    });
  }
  row.commit();
}

/** Add rows, committing each and yielding regularly. */
async function commitRows(sheet: ExcelJS.Worksheet, rows: Iterable<ExcelJS.CellValue[]>) {
  let cells = 0;
  for (const values of rows) {
    sheet.addRow(values).commit();
    cells += values.length;
    if (cells >= CELLS_PER_YIELD) {
      cells = 0;
      await yieldToEventLoop();
    }
  }
}

function addAboutSheet(workbook: ExcelJS.stream.xlsx.WorkbookWriter, type: ExportType) {
  const latest = getLatestSnapshot();
  const sheet = workbook.addWorksheet("About");
  sheet.columns = [{ width: 22 }, { width: 90 }];
  const rows: [string, string | number | Date][] = [
    ["Report", EXPORT_TYPES[type].label],
    ["Contents", EXPORT_TYPES[type].description],
    ["Latest snapshot (UTC)", latest ? snapshotDate(latest.timestamp) : "none"],
    ["Snapshots", getSnapshotCount()],
    ["Generated (UTC)", new Date()],
    ["Values", "Share of HiveOS workers, in percent (0.00)"],
    ["Source", "https://api2.hiveos.farm/api/v2/hive/stats"],
  ];
  for (const values of rows) {
    const row = sheet.addRow(values);
    row.getCell(1).font = HEADER_FONT;
    if (values[1] instanceof Date) row.getCell(2).numFmt = "yyyy-mm-dd hh:mm";
    row.getCell(2).alignment = { horizontal: "left" };
    row.commit();
  }
  sheet.commit();
}

/**
 * Pivot row order: items in the latest snapshot first, largest share first;
 * then items that have dropped out, most recently seen first.
 */
function pivotNameOrder(names: string[], series: TimeSeriesPoint[]): string[] {
  const lastIndex = new Map<string, number>();
  for (const name of names) {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i][name] !== undefined) {
        lastIndex.set(name, i);
        break;
      }
    }
  }
  const latest = series[series.length - 1] ?? { date: "" };
  return [...names].sort((a, b) => {
    const va = latest[a] as number | undefined;
    const vb = latest[b] as number | undefined;
    if (va !== undefined || vb !== undefined) return (vb ?? -1) - (va ?? -1) || a.localeCompare(b);
    return (lastIndex.get(b) ?? -1) - (lastIndex.get(a) ?? -1) || a.localeCompare(b);
  });
}

async function writeSnapshotSheets(workbook: ExcelJS.stream.xlsx.WorkbookWriter) {
  for (const cat of ALL_CATEGORIES) {
    const sheet = addSheet(workbook, CATEGORY_LABELS[cat], 3);
    sheet.columns = [
      { key: "name", width: 30 },
      { key: "amount", width: 13, style: { numFmt: PCT_FORMAT } },
      { key: "snapshot", width: 18, style: { numFmt: "yyyy-mm-dd hh:mm" } },
    ];
    commitHeader(sheet, ["Name", "Amount (%)", "Snapshot (UTC)"]);
    const items = getCategoryData(cat);
    await commitRows(
      sheet,
      (function* () {
        for (const item of items) yield [item.name, round2(item.amount), snapshotDate(item.snapshot)];
      })()
    );
    sheet.commit();
  }
}

async function writeDiffSheets(workbook: ExcelJS.stream.xlsx.WorkbookWriter) {
  for (const cat of ALL_CATEGORIES) {
    const { previousDate, latestDate, rows } = getSnapshotDiff(cat);
    const labels = getDisplayNames(cat, rows.map((r) => r.name));
    const sheet = addSheet(workbook, `${CATEGORY_LABELS[cat]} Diff`, 6);
    sheet.columns = [
      { width: 30 },
      { width: 30 },
      { width: 28, style: { numFmt: PCT_FORMAT } },
      { width: 28, style: { numFmt: PCT_FORMAT } },
      { width: 13, style: { numFmt: "+0.00;-0.00;0.00" } },
      { width: 10 },
    ];
    commitHeader(sheet, [
      "Name",
      "Display name",
      `Previous (%) ${previousDate ?? ""}`.trim(),
      `Latest (%) ${latestDate ?? ""}`.trim(),
      "Change (pp)",
      "Status",
    ]);
    await commitRows(sheet, rows.map((r) => [r.name, labels[r.name] ?? r.name, r.previous, r.latest, r.change, r.status]));
    sheet.commit();
  }
}

async function writePivotSheets(workbook: ExcelJS.stream.xlsx.WorkbookWriter, monthly: boolean) {
  for (const cat of ALL_CATEGORIES) {
    const names = getUniqueNames(cat);
    if (names.length === 0) continue;

    const daily = getTimeSeries(cat, names);
    const series = monthly ? toMonthly(daily, names) : daily;
    const periods = series.map((p) => p.date);
    const labels = getDisplayNames(cat, names);
    const sheet = addSheet(workbook, `${CATEGORY_LABELS[cat]} ${monthly ? "Monthly" : "Pivot"}`, periods.length + 2, 2);
    sheet.columns = [
      { width: 30 },
      { width: 30 },
      ...periods.map(() => ({ width: monthly ? 9 : 11, style: { numFmt: PCT_FORMAT } })),
    ];
    commitHeader(sheet, ["Name", "Display name", ...periods.map(dayOrMonthDate)], monthly ? "yyyy-mm" : "yyyy-mm-dd");

    const order = pivotNameOrder(names, daily);
    await commitRows(
      sheet,
      (function* () {
        for (const name of order) {
          yield [name, labels[name] ?? name, ...series.map((p) => (p[name] as number | undefined) ?? null)];
        }
      })()
    );
    sheet.commit();
    await yieldToEventLoop();
  }
}

/** Average each item over the days it was present in each month. */
function toMonthly(daily: TimeSeriesPoint[], names: string[]): TimeSeriesPoint[] {
  const months = new Map<string, Map<string, { sum: number; n: number }>>();
  for (const point of daily) {
    const month = point.date.slice(0, 7);
    let acc = months.get(month);
    if (!acc) months.set(month, (acc = new Map()));
    for (const name of names) {
      const v = point[name] as number | undefined;
      if (v === undefined) continue;
      const a = acc.get(name) ?? { sum: 0, n: 0 };
      a.sum += v;
      a.n += 1;
      acc.set(name, a);
    }
  }
  return [...months.keys()].sort().map((month) => {
    const point: TimeSeriesPoint = { date: month };
    for (const [name, { sum, n }] of months.get(month)!) point[name] = round2(sum / n);
    return point;
  });
}

/** Write an export workbook to a stream. Resolves once the stream is finished. */
export async function writeExport(type: ExportType, stream: Writable): Promise<void> {
  const workbook = newWorkbook(stream);
  if (type === "snapshot") await writeSnapshotSheets(workbook);
  else if (type === "diff") await writeDiffSheets(workbook);
  else await writePivotSheets(workbook, type === "monthly");
  addAboutSheet(workbook, type);
  await workbook.commit();
}
