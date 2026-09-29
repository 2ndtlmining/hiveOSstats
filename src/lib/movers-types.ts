/** Top Movers types and constants, safe to import from client components. */

import type { CategoryKey } from "@/types";

export const MOVER_WINDOWS = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type MoverWindow = keyof typeof MOVER_WINDOWS;
export const DEFAULT_MOVER_WINDOW: MoverWindow = "30d";

export function isMoverWindow(value: unknown): value is MoverWindow {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MOVER_WINDOWS, value);
}

export interface Mover {
  name: string;
  category: CategoryKey;
  categoryLabel: string;
  /** Share at the start and end of the window, in percent (3-day averages). */
  start: number;
  end: number;
  /** Change in percentage points. */
  change: number;
  /** Relative change in percent, or null when the item started at 0 (new). */
  relative: number | null;
  /** Daily share across the window, for a sparkline. */
  spark: number[];
}
