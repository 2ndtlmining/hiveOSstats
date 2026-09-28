"use client";

import { useState } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPORT_TYPES, type ExportType } from "@/lib/export-types";

function filenameFrom(res: Response, fallback: string) {
  const match = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

/** Downloads an Excel export, showing progress and errors on the button. */
export function ExportButton({ type }: { type: ExportType }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const { label, slug } = EXPORT_TYPES[type];

  async function download() {
    setState("loading");
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filenameFrom(res, `hiveos-${slug}.xlsx`);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={download}
      disabled={state === "loading"}
      aria-busy={state === "loading"}
      title={state === "error" ? "Download failed, click to retry" : undefined}
    >
      {state === "loading" ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : state === "error" ? (
        <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {state === "loading" ? "Preparing…" : state === "error" ? `Retry ${label}` : label}
    </Button>
  );
}
