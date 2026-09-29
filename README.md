# HiveOS Stats Dashboard

A modern mining statistics dashboard that fetches live data from the HiveOS public API, stores daily JSON snapshots, and visualizes trends over time.

---

## Overview

HiveOS Stats Dashboard collects and displays cryptocurrency mining statistics from the [HiveOS public API](https://api2.hiveos.farm/api/v2/hive/stats). It captures daily snapshots of mining ecosystem data -- covering coins, algorithms, GPU brands, GPU models, mining software, and ASIC models -- and provides interactive charts, comparison tools, and Excel exports to help users track how the mining landscape evolves.

This is a full rewrite of the original Python Dash application, rebuilt from the ground up with Next.js 15 and TypeScript for a faster, more interactive experience.

---

## Features

- **Dashboard** -- Stats cards for each data category with sparkline charts for top items, snapshot count, latest timestamp, and a "Top Movers" section highlighting items with the biggest percentage changes
- **Explorer** -- Interactive exploration with category tabs, multi-select item filtering, line charts for time series data, and sortable data tables
- **Trends** -- Pre-built stacked area charts for six key views: GPU Market Share, Top Coins, Mining Software Popularity, Top Algorithms, Top NVIDIA Models, and Top AMD Models
- **Compare** -- Side-by-side comparison of any two items within a category, with diff tables showing value changes over time
- **Snapshot System** -- Automatic daily snapshots via a built-in scheduler (one per day after 06:00 UTC, with automatic catch-up and retry); authenticated manual snapshots via API; responses are validated before saving, and both raw and cleaned data are kept
- **Excel Export** -- Four export types: full snapshot data, differences between snapshots, daily pivot tables, and monthly pivot tables
- **Dark Theme** -- Styled with HiveOS brand colors (#FFB800 primary) on dark backgrounds
- **Mobile Responsive** -- Collapsible sidebar navigation that adapts to mobile screen sizes
- **7 Data Categories** -- Coins, Algorithms, GPU Brands, NVIDIA Models, AMD Models, Miners, and ASIC Models

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org/) | React framework with App Router and API routes |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Pre-built accessible UI components |
| [Recharts 3](https://recharts.org/) | Composable charting library |
| [next-themes](https://github.com/pacocoursey/next-themes) | Theme management |
| [ExcelJS](https://github.com/exceljs/exceljs) | Excel file generation for data exports |
| [Lucide React](https://lucide.dev/) | Icon library |

---

## Getting Started

### Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- npm

### Installation

```bash
git clone https://github.com/2ndtlmining/hiveOSstats.git
cd hiveOSstats
npm ci
```

`package-lock.json` is committed, so `npm ci` installs exactly the tested dependency versions on every machine. Node.js 20+ is required (see `.nvmrc`).

### Environment Variables

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

Available variables:

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | No | GitHub token for committing snapshots to the repo |
| `CRON_SECRET` | No | Enables `/api/cron/snapshot` for manual/external triggers (Bearer token). If unset, the endpoint is disabled; the built-in scheduler works either way |
| `DATA_DIR` | No | Where snapshots are stored (default: `./data`) |
| `HEALTHCHECK_PING_URL` | No | Pinged after every successful daily snapshot (e.g. a [Healthchecks.io](https://healthchecks.io) check), so a missed day alerts you |
| `EXPORT_CACHE_DIR` | No | Where generated Excel exports are cached (default: `<os tmp>/hiveos-stats-exports`). Safe to delete; files are regenerated |

### Development

```bash
npm run dev
```

The app runs on **port 8050** by default. Open [http://localhost:8050](http://localhost:8050) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/snapshot/route.ts    # Manual/external snapshot trigger (needs CRON_SECRET)
│   │   ├── export/route.ts           # Excel exports, served from the export cache
│   │   ├── health/route.ts           # Health check for uptime monitors
│   │   └── snapshots/route.ts        # Historical data queries
│   ├── compare/
│   │   ├── compare-client.tsx        # Client component for comparison UI
│   │   └── page.tsx                  # Compare page (server component)
│   ├── explore/
│   │   ├── explorer-client.tsx       # Client component for explorer UI
│   │   └── page.tsx                  # Explorer page (server component)
│   ├── trends/
│   │   ├── trends-client.tsx         # Client component for trends UI
│   │   └── page.tsx                  # Trends page (server component)
│   ├── dashboard-client.tsx          # Client component for dashboard UI
│   ├── globals.css                   # Global styles and Tailwind imports
│   ├── layout.tsx                    # Root layout with sidebar and theme provider
│   └── page.tsx                      # Dashboard page (server component)
├── components/
│   ├── charts/
│   │   ├── area-chart.tsx            # Stacked area chart (Trends page)
│   │   ├── line-chart.tsx            # Multi-line chart (Explorer page)
│   │   └── sparkline.tsx             # Mini sparkline chart (Dashboard cards)
│   ├── layout/
│   │   ├── sidebar.tsx               # Collapsible sidebar navigation
│   │   └── theme-provider.tsx        # Dark/light theme context provider
│   └── ui/                           # shadcn/ui components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── tabs.tsx
│       └── tooltip.tsx
├── lib/
│   ├── data.ts                       # Snapshot reading, time series aggregation, data queries
│   ├── export.ts                     # Excel workbook generation (4 export types)
│   ├── hiveos.ts                     # HiveOS API client and data cleaning
│   └── utils.ts                      # Shared utility functions
├── instrumentation.ts                # Starts the built-in snapshot scheduler on server start
└── types/
    └── index.ts                      # TypeScript type definitions and category constants
```

Additional project root files:

```
data/                   # JSON snapshot storage directory
deploy.sh               # Server deploy: backup data/, pull main, npm ci, build
scripts/backup-data.sh  # Archive data/ (keeps the newest 30)
Dockerfile              # Multi-stage Docker build
next.config.ts          # Next.js configuration (standalone output)
.env.example            # Environment variable template
```

---

## API Routes

### `GET /api/health`

For uptime monitors. Returns **200** when the latest snapshot is at most 30 hours old and **503** when it's older (or there are none), so a monitor alerts when daily snapshots stop.

```json
{
  "status": "ok",
  "snapshotCount": 838,
  "latestSnapshot": "2026-09-28T06:01:42.000Z",
  "ageHours": 14.2,
  "staleAfterHours": 30,
  "scheduler": { "lastRunAt": "...", "lastResult": "skipped", "lastSuccessAt": "...", "lastError": null, "lastErrorAt": null },
  "uptimeSec": 51234
}
```

The dashboard also shows an amber banner on every page when data is stale.

---

### `GET|POST /api/cron/snapshot`

Takes a new snapshot: fetches data from HiveOS, validates it, cleans it, and saves both raw and cleaned JSON files to the `data/` directory.

**Automatic scheduling:** You normally never need this endpoint. When the app is running, the built-in scheduler (`src/instrumentation.ts` + `src/lib/snapshot.ts`) checks every 10 minutes whether a snapshot is due (none taken since the most recent 06:00 UTC) and takes one if so. Missed runs (restart, API outage) are caught up automatically.

**Manual trigger:** Requires `CRON_SECRET` to be set on the server:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:8050/api/cron/snapshot
```

| Status | Meaning |
|--------|---------|
| 200 | Snapshot saved |
| 401 | Missing or wrong token |
| 429 | A snapshot was taken less than 15 minutes ago |
| 502 | HiveOS API failed or returned invalid data (invalid responses are kept as `rejected_raw_data_*.json`) |
| 503 | `CRON_SECRET` not configured, so the endpoint is disabled |

**Response:**
```json
{
  "success": true,
  "files": { "raw": "raw_data_mar_2026-03-12_06-00-00.json", "cleaned": "cleaned_data_mar_2026-03-12_06-00-00.json" },
  "timestamp": "2026-03-12T06:00:00.000Z"
}
```

---

### `GET /api/snapshots`

Queries historical snapshot data from stored JSON files.

**Query Parameters:**

| Parameter | Values | Description |
|---|---|---|
| `action` | `summary`, `names`, `latest` | Action to perform |
| `category` | `coins`, `algos`, `gpu_brands`, `nvidia_models`, `amd_models`, `miners`, `asic_models` | Data category |
| `names` | Comma-separated item names | Items to include in time series |

- `?action=summary` -- Returns snapshot count and latest timestamp
- `?action=names&category=coins` -- Returns list of unique item names for a category
- `?action=latest` -- Returns the most recent snapshot (optionally filtered by category)
- `?category=coins&names=BTC,ETH` -- Returns daily time series for up to 20 items. An item has no value on days it wasn't in HiveOS's stats

Unknown actions or categories, a missing `category`, or more than 20 names return **400**. Responses carry an `ETag` (the data version; `If-None-Match` gets a 304) and are gzipped when the client accepts it.

---

### `GET /api/export`

Downloads an Excel report. Each report is generated once per snapshot, cached on disk and streamed from there, so downloads are near-instant. The scheduler pre-generates all four after each new snapshot. Generation uses ExcelJS's streaming writer and yields to the event loop regularly, so it never freezes the rest of the site.

**Query Parameters:**

| Parameter | Values | Default | Description |
|---|---|---|---|
| `type` | `snapshot`, `diff`, `daily`, `monthly` | `snapshot` | Export type |

- `snapshot` -- All data points across all snapshots, one sheet per category
- `diff` -- Latest vs previous snapshot for every item in either one: both values, the change in percentage points, and whether the item is `new` or `dropped`. Sorted by size of change
- `daily` -- Pivot table with items as rows and dates as columns. A cell is blank on days the item wasn't in HiveOS's stats
- `monthly` -- Pivot table with items as rows and months as columns (average of the days the item was present)

Every workbook has frozen, filterable header rows, real Excel dates (so PivotTables can group by month or quarter), amounts rounded to 2 decimals, and an **About** sheet with the snapshot date and generation time. Pivot rows list the items in the latest snapshot first, largest share first.

**Response:** `.xlsx` file download, named e.g. `hiveos-daily-pivot_2026-09-28.xlsx`

---

## Data Storage

Snapshots are stored as JSON files in the `data/` directory at the project root.

### File Naming Convention

- **Cleaned data:** `cleaned_data_{month}_{timestamp}.json`
  - Example: `cleaned_data_mar_2026-03-12_06-00-00.json`
- **Raw data:** `raw_data_{month}_{timestamp}.json`
  - Example: `raw_data_mar_2026-03-12_06-00-00.json`

### Cleaned vs Raw

- **Raw files** contain the unmodified API response from HiveOS (amounts as decimal fractions)
- **Cleaned files** contain processed data with names normalized to uppercase, special characters replaced, amounts converted to percentages, and duplicate entries merged

### Data Structure

Each cleaned snapshot is a JSON object keyed by category (`coins`, `algos`, `gpu_brands`, `nvidia_models`, `amd_models`, `miners`, `asic_models`). Each category maps item names to objects containing `name`, `amount` (percentage), and `snapshot` (timestamp string).

---

## Deployment

### Self-Hosted (Primary)

The app includes a built-in snapshot scheduler that runs automatically when the server starts. No external cron jobs needed.

```bash
npm run build
npm start
```

On startup you will see: `[Snapshot] Scheduler started - daily snapshot after 06:00 UTC, checked every 10 min`

The scheduler runs via the Next.js instrumentation hook (`src/instrumentation.ts`). Rather than firing at an exact time, it checks every 10 minutes (and 30 seconds after boot) whether a snapshot is due. A restart, a late timer, or a HiveOS outage just delays the snapshot until the next successful check instead of skipping the day. Watch for `[Snapshot]` lines in the logs (e.g. `journalctl -u <service> | grep Snapshot`). Snapshots are saved to the `data/` directory (override with `DATA_DIR`).

### Running as a service (systemd)

`deploy/hiveos-stats.service` restarts the app if it crashes and starts it on boot. Edit `User`, `WorkingDirectory` and the node path (`command -v node`) first, then:

```bash
sudo cp deploy/hiveos-stats.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hiveos-stats
journalctl -u hiveos-stats -f        # logs, including [Snapshot] and [Export] lines
```

Point an uptime monitor at `/api/health` to be alerted when the site is down or the data is stale.

### Updating the server

`deploy.sh` backs up `data/`, pulls `main`, runs `npm ci` and builds. Restart the app afterwards.

```bash
./deploy.sh
```

Back up `data/` nightly as well; it is the only copy of the snapshot history:

```bash
# crontab -e
30 6 * * * cd ~/hiveOSstats && scripts/backup-data.sh >> ~/hiveos-backup.log 2>&1
```

To restore, stop the app and extract an archive in the project directory: `tar xzf ../hiveOSstats-backups/data-<timestamp>.tar.gz`.

### Docker

A multi-stage Dockerfile is included for containerized deployments.

```bash
docker build -t hiveos-stats .
docker run -p 8050:8050 hiveos-stats
```

The Docker image uses Node.js 20 Alpine, produces a standalone Next.js build, and exposes port 8050. Snapshots are not baked into the image: mount the data directory as a volume so they persist:

```bash
docker run -p 8050:8050 -v $(pwd)/data:/app/data hiveos-stats
```

### Netlify

Netlify's (and Vercel's) filesystem is not persistent, so snapshots saved to `data/` are lost between deploys. Self-hosting or Docker with a volume is recommended.

1. Connect your GitHub repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `.next`
4. Install the [Next.js runtime plugin](https://github.com/netlify/next-runtime) for full API route and SSR support

Note: Netlify does not run scheduled jobs for this app. You will need an external scheduler (such as GitHub Actions, cron-job.org, or a similar service) to trigger the `/api/cron/snapshot` endpoint on a schedule, sending `Authorization: Bearer $CRON_SECRET`.

---

## Future Improvements

- **Dark/light theme toggle** -- User-selectable theme switching (infrastructure already in place via next-themes)
- **Time range picker** -- Filter charts by 7-day, 30-day, 90-day, or all-time windows
- **Loading skeletons and error boundaries** -- Improved loading states and graceful error handling
- **SEO metadata and Open Graph tags** -- Per-page metadata for better search engine indexing and social sharing
- **Supabase migration path** -- Move from JSON file storage to Supabase for SQL querying, realtime subscriptions, and better scalability
- **Webhook notifications** -- Alerts on significant data changes (e.g., large market share shifts)
- **Historical data backfill** -- Import data from additional sources to extend the timeline
- **ISR (Incremental Static Regeneration)** -- Performance optimization for pages that do not need real-time data
- **PWA support** -- Progressive Web App capabilities for mobile users
- **CSV export** -- Additional export format alongside Excel
- **Cross-category comparison** -- Compare items across different categories (e.g., a coin vs. an algorithm)
- **Alert system** -- Configurable threshold-based alerts for monitored items

---

## Legacy Python App

The original Python Dash application (`app.py`, `snapshot.py`, `excel_output.py`) has been removed from `main`. It is preserved at the `legacy-python` tag:

```bash
git checkout legacy-python
```

---

## License

This project is licensed under the [MIT License](LICENSE).
