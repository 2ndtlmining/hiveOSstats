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
- **Snapshot System** -- Manual snapshots via API call and automated daily snapshots via Vercel cron (runs at 06:00 UTC); both raw and cleaned data are saved
- **Excel Export** -- Four export types: full snapshot data, differences between snapshots, daily pivot tables, and monthly pivot tables
- **Dark Theme** -- Styled with HiveOS brand colors (#FFB800 primary) on dark backgrounds
- **Mobile Responsive** -- Collapsible sidebar navigation that adapts to mobile screen sizes
- **7 Data Categories** -- Coins, Algorithms, GPU Brands, NVIDIA Models, AMD Models, Miners, and ASIC Models

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) | React framework with App Router and API routes |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Pre-built accessible UI components |
| [Recharts 3](https://recharts.org/) | Composable charting library |
| [Framer Motion](https://www.framer.com/motion/) | Animation and transitions |
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
npm install
```

**Note:** Linux platform binaries for Tailwind CSS are included as optional dependencies. If you still see an Oxide native binding error, try:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

Available variables:

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | No | GitHub token for committing snapshots to the repo |
| `CRON_SECRET` | No | Secret for securing Vercel cron job endpoints |

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
│   │   ├── cron/snapshot/route.ts    # Cron-triggered snapshot endpoint
│   │   ├── export/route.ts           # Excel export endpoint
│   │   ├── snapshots/route.ts        # Manual snapshot trigger
│   │   └── stats/route.ts            # Live stats proxy from HiveOS API
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
└── types/
    └── index.ts                      # TypeScript type definitions and category constants
```

Additional project root files:

```
data/                   # JSON snapshot storage directory
vercel.json             # Vercel cron configuration
Dockerfile              # Multi-stage Docker build
next.config.ts          # Next.js configuration (standalone output)
.env.example            # Environment variable template
```

---

## API Routes

### `GET /api/stats`

Proxies a live request to the HiveOS public API and returns raw statistics.

**Response:** Raw JSON from `https://api2.hiveos.farm/api/v2/hive/stats`

---

### `GET|POST /api/cron/snapshot`

Takes a new snapshot: fetches data from HiveOS, cleans it, and saves both raw and cleaned JSON files to the `data/` directory. This endpoint is called automatically by Vercel cron at 06:00 UTC daily.

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
- `?category=coins&names=BTC,ETH` -- Returns time series data for selected items

---

### `GET /api/export`

Generates and downloads an Excel file.

**Query Parameters:**

| Parameter | Values | Default | Description |
|---|---|---|---|
| `type` | `snapshot`, `diff`, `daily`, `monthly` | `snapshot` | Export type |

- `snapshot` -- All data points across all snapshots, one sheet per category
- `diff` -- Difference between the two most recent snapshots for each item
- `daily` -- Pivot table with items as rows and dates as columns
- `monthly` -- Pivot table with items as rows and months as columns (averaged)

**Response:** `.xlsx` file download

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

### Vercel (Primary)

The project is configured for Vercel with automated daily snapshots.

1. Connect your GitHub repository to Vercel
2. Set environment variables in the Vercel dashboard if needed
3. Deploy -- Vercel will detect Next.js automatically

The `vercel.json` configures a cron job that hits `/api/cron/snapshot` daily at 06:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Note: Vercel cron jobs require a Pro or Enterprise plan.

### Docker

A multi-stage Dockerfile is included for containerized deployments.

```bash
docker build -t hiveos-stats .
docker run -p 8050:8050 hiveos-stats
```

The Docker image uses Node.js 20 Alpine, produces a standalone Next.js build, and exposes port 8050. The `data/` directory is copied into the container at build time.

To persist snapshots across container restarts, mount the data directory as a volume:

```bash
docker run -p 8050:8050 -v $(pwd)/data:/app/data hiveos-stats
```

### Netlify

As an alternative to Vercel:

1. Connect your GitHub repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `.next`
4. Install the [Next.js runtime plugin](https://github.com/netlify/next-runtime) for full API route and SSR support

Note: Netlify does not natively support Vercel-style cron jobs. You will need an external scheduler (such as GitHub Actions, cron-job.org, or a similar service) to trigger the `/api/cron/snapshot` endpoint on a schedule.

---

## Future Improvements

- **Dark/light theme toggle** -- User-selectable theme switching (infrastructure already in place via next-themes)
- **Framer Motion page transitions** -- Animated route transitions and component entrance animations
- **Time range picker** -- Filter charts by 7-day, 30-day, 90-day, or all-time windows
- **Loading skeletons and error boundaries** -- Improved loading states and graceful error handling
- **SEO metadata and Open Graph tags** -- Per-page metadata for better search engine indexing and social sharing
- **Supabase migration path** -- Move from JSON file storage to Supabase for SQL querying, realtime subscriptions, and better scalability
- **Authentication for admin actions** -- Protect snapshot-taking and other administrative endpoints
- **Webhook notifications** -- Alerts on significant data changes (e.g., large market share shifts)
- **Historical data backfill** -- Import data from additional sources to extend the timeline
- **ISR (Incremental Static Regeneration)** -- Performance optimization for pages that do not need real-time data
- **PWA support** -- Progressive Web App capabilities for mobile users
- **CSV export** -- Additional export format alongside Excel
- **Cross-category comparison** -- Compare items across different categories (e.g., a coin vs. an algorithm)
- **Alert system** -- Configurable threshold-based alerts for monitored items

---

## Legacy Python App

The original Python Dash application files are retained in the repository root for reference:

- `app.py` -- Dash web application with Plotly charts
- `snapshot.py` -- Data fetching and snapshot logic
- `excel_output.py` -- Excel export generation

These files are no longer actively maintained and are superseded by the Next.js implementation.

---

## License

This project is licensed under the [MIT License](LICENSE).
