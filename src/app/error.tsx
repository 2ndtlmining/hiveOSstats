"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          This page couldn&apos;t load
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Something went wrong while reading the snapshot data. It&apos;s usually temporary: try
          again, or check <code>/api/health</code> and the server logs.
        </p>
        {error.digest && (
          <p>
            Error reference: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={reset}>
            <RotateCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
