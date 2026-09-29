import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Inline error with a retry button, shown in place of a chart. */
export function ChartError({ message, onRetry, height = 350 }: { message: string; onRetry: () => void; height?: number }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground" style={{ height }}>
      <p className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Couldn&apos;t load the chart: {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

export function ChartEmpty({ children, height = 350 }: { children: React.ReactNode; height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
      {children}
    </div>
  );
}
