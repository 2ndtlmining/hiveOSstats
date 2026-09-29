import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardHeader>
        <CardTitle>Page not found</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>There&apos;s no page at this address.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={buttonVariants({ size: "sm" })}>Dashboard</Link>
          <Link href="/explore" className={buttonVariants({ variant: "outline", size: "sm" })}>Explorer</Link>
          <Link href="/trends" className={buttonVariants({ variant: "outline", size: "sm" })}>Trends</Link>
        </div>
      </CardContent>
    </Card>
  );
}
