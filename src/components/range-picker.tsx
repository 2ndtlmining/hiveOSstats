"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, RANGES, type Range } from "@/lib/ranges";

const RANGE_KEYS = Object.keys(RANGES) as Range[];

const itemClass = (active: boolean) =>
  cn(
    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
    active ? "bg-hiveos text-black" : "text-muted-foreground hover:text-foreground"
  );

/** Segmented 30D · 90D · 6M · 1Y · All control: buttons with onChange, or links with hrefFor. */
export function RangePicker({
  value,
  onChange,
  hrefFor,
}: {
  value: Range;
  onChange?: (range: Range) => void;
  hrefFor?: (range: Range) => string;
}) {
  return (
    <div role="group" aria-label="Time range" className="inline-flex rounded-md border border-border p-0.5">
      {RANGE_KEYS.map((range) =>
        hrefFor ? (
          <Link
            key={range}
            href={hrefFor(range)}
            scroll={false}
            aria-current={range === value ? "true" : undefined}
            className={itemClass(range === value)}
          >
            {RANGE_LABELS[range]}
          </Link>
        ) : (
          <button
            key={range}
            type="button"
            onClick={() => onChange?.(range)}
            aria-pressed={range === value}
            className={itemClass(range === value)}
          >
            {RANGE_LABELS[range]}
          </button>
        )
      )}
    </div>
  );
}
