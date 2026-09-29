"use client";

import "./globals.css";

/** Last resort when the root layout itself fails; replaces the whole page. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">HiveOS Stats is having trouble</h1>
          <p className="text-sm text-muted-foreground">
            The page couldn&apos;t be displayed.
            {error.digest && <> Error reference: <code>{error.digest}</code>.</>}
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
