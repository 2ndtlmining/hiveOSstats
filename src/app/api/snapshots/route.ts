import { createHash } from "crypto";
import { gzipSync } from "zlib";
import { NextRequest, NextResponse } from "next/server";
import {
  getDataVersion,
  getLatestSnapshot,
  getSnapshotCount,
  getTimeSeries,
  getUniqueNames,
} from "@/lib/data";
import { parseSnapshotsQuery } from "@/lib/snapshots-query";

/**
 * JSON response, gzipped when the client accepts it. Next.js compresses pages
 * but not route handler responses, and series are ~40 KB for a few items.
 */
function json(req: NextRequest, data: unknown, headers: Record<string, string>) {
  const body = JSON.stringify(data);
  const acceptsGzip = /\bgzip\b/.test(req.headers.get("accept-encoding") ?? "");
  const common = { ...headers, "Content-Type": "application/json", Vary: "Accept-Encoding" };
  if (!acceptsGzip || body.length < 1024) return new NextResponse(body, { headers: common });
  return new NextResponse(new Uint8Array(gzipSync(body)), {
    headers: { ...common, "Content-Encoding": "gzip" },
  });
}

export async function GET(req: NextRequest) {
  const query = parseSnapshotsQuery(req.nextUrl.searchParams);
  if ("error" in query) {
    return NextResponse.json({ error: query.error }, { status: 400 });
  }

  // Data changes once a day: let browsers revalidate cheaply with the data version
  const etag = `"${createHash("sha1").update(getDataVersion()).digest("base64url").slice(0, 16)}"`;
  const headers = { ETag: etag, "Cache-Control": "public, max-age=60, stale-while-revalidate=86400" };
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  switch (query.action) {
    case "summary": {
      const latest = getLatestSnapshot();
      return json(req, { snapshotCount: getSnapshotCount(), latestTimestamp: latest?.timestamp ?? null }, headers);
    }
    case "latest": {
      const latest = getLatestSnapshot();
      if (!latest) return NextResponse.json({ error: "No data" }, { status: 404 });
      return json(req, query.category ? latest.data[query.category] ?? {} : latest, headers);
    }
    case "names":
      return json(req, getUniqueNames(query.category), headers);
    case "series":
      return json(req, getTimeSeries(query.category, query.names), headers);
  }
}
