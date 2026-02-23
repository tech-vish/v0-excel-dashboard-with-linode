# Indian Art Villa — Excel Dashboard

A **Next.js 16** business intelligence dashboard that parses multi-sheet `.xlsx` / `.xls` files from **Linode Object Storage** and renders KPI cards, interactive charts, and a full-featured data table explorer — all in a premium dark/light-mode UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Environment Variables](#environment-variables)
6. [Getting Started](#getting-started)
7. [Architecture & Data Flow](#architecture--data-flow)
8. [Supported Excel Sheets](#supported-excel-sheets)
9. [Sales Channels](#sales-channels)
10. [Component Reference](#component-reference)
11. [Library Reference (`lib/`)](#library-reference-lib)
12. [API Route](#api-route--apiexcel)
13. [Theming & Design System](#theming--design-system)

---

## Overview

The dashboard provides a single-page application for analysing Indian Art Villa's monthly financial data. Users either **upload** an Excel file from their local machine or **load** a previously uploaded file directly from **Linode S3** (compatible with the AWS S3 API using Signature V4).

Once data is loaded the app shows:

- **KPI Cards** — at-a-glance metrics (Net Sales, COGS, Gross Margin, Total Orders, Return Rate, Closing Stock)
- **Charts Dashboard** — channel-wise bar and pie charts plus a top-10-states horizontal bar chart
- **Data Viewer** — tabbed table explorer for every sheet in the workbook with search, colour-coded rows, and sticky headers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 4 |
| UI Primitives | shadcn/ui (Radix UI) |
| Charts | Recharts 2.15 |
| Excel parsing | SheetJS (`xlsx` 0.18) |
| Cloud storage | Linode Object Storage (S3-compatible) |
| Theme | next-themes |
| Icons | lucide-react |

---

## Project Structure

```
v0-excel-dashboard-with-linode/
├── app/
│   ├── api/
│   │   └── excel/
│   │       └── route.ts        # POST (upload) + GET (download) via Linode S3
│   ├── globals.css             # CSS custom properties & design tokens
│   ├── layout.tsx              # Root layout with ThemeProvider
│   └── page.tsx                # Main page — upload screen → dashboard
│
├── components/
│   ├── charts-dashboard.tsx    # Recharts bar/pie charts
│   ├── data-viewer.tsx         # Tabbed table explorer
│   ├── kpi-cards.tsx           # KPI metric cards
│   ├── theme-provider.tsx      # next-themes wrapper
│   ├── theme-toggle.tsx        # Dark/light mode button
│   ├── top-bar.tsx             # Header with period & load timestamp
│   ├── upload-screen.tsx       # File upload / S3 load landing
│   └── ui/                     # shadcn/ui generated components (57 files)
│
├── hooks/
│   ├── use-mobile.ts           # Viewport breakpoint hook
│   └── use-toast.ts            # Toast notification hook
│
├── lib/
│   ├── data-helpers.ts         # Type definitions + data utility functions
│   ├── excel-processor.ts      # SheetJS workbook parser
│   ├── sheet-config.ts         # Per-sheet config + CHANNELS + CHANNEL_COLORS
│   └── utils.ts                # Tailwind class merge utility (cn)
│
├── public/                     # Static assets
├── styles/                     # Additional global styles
├── .env.local                  # Environment variables (not committed)
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## Features

### 1. File Upload (local)
- Drag-and-drop or click-to-browse for `.xlsx` / `.xls` files
- Simultaneous upload to Linode S3 (fire-and-forget backup) and local browser parsing
- Clear error states and loading spinner

### 2. Load from Linode S3
- One-click retrieval of the most recently uploaded file from the configured S3 bucket
- Base64 decoding of the response body before local parsing

### 3. KPI Cards
Six summary metrics extracted from the P&L and Orders sheets:

| KPI | Source Sheet | Row Label |
|---|---|---|
| Net Sales | `IAV P&L NOV 2025` | `Net Sale` |
| Cost of Goods Sold | `IAV P&L NOV 2025` | `Total COGS` |
| Gross Margin % | Calculated | `(Net Sale − COGS) / Net Sale` |
| Total Orders | `ORDERS SHEET` | `TOTAL ORDERS` |
| Return Rate | `ORDERS SHEET` | `RETURN ORDERS / TOTAL ORDERS` |
| Closing Stock (at Cost) | `STOCK VALUE` | `TOTAL STOCK VALUE AT COST` |

### 4. Charts Dashboard
All charts render only when the relevant data is present in the loaded file:

| Chart | Type | Data Source |
|---|---|---|
| Channel-wise Net Sales | Vertical Bar | `% Sheet` → row `Sales (Rs.)` |
| Sales Mix by Channel | Donut Pie | `% Sheet` → row `Share In Net Sale` |
| Channel-wise Margin % | Vertical Bar | `% Sheet` → row `Margin %` |
| Top States by Net Sales (Amazon) | Horizontal Bar | `STATEWISE SALE` sheet |

### 5. Data Viewer
- Tab strip for every sheet in the workbook (short names from `SHEET_CONFIG`)
- Row count and column count metadata bar
- Full-text search with highlighted matches
- Colour-coded rows: **title** (bold), **header** (gold, sticky), **section** (gold uppercase), **total** (bold with gold top border), **data** (zebra-striped)
- Numbers auto-formatted as ₹ (INR), percentages, or plain
- Sticky first column and sticky header row for large sheets

### 6. Dark / Light Mode
Toggle in the top-right corner on the upload screen and in the top bar. Persists via `localStorage` with `next-themes`.

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Linode Object Storage — S3-compatible
LINODE_REGION=in-maa-1              # e.g. us-east-1, eu-central-1, in-maa-1
LINODE_ACCESS_KEY=your_access_key
LINODE_SECRET_KEY=your_secret_key
LINODE_BUCKET=your_bucket_name
LINODE_OBJECT_KEY=data.xlsx         # key (filename) stored in the bucket
```

> **Note:** The Linode endpoint URL is constructed as:  
> `https://{LINODE_BUCKET}.{LINODE_REGION}.linodeobjects.com/{LINODE_OBJECT_KEY}`

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm / pnpm

### Installation

```bash
# Using npm
npm install

# Using pnpm
pnpm install
```

### Development

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## Architecture & Data Flow

```
User selects / drops .xlsx file
        │
        ▼
UploadScreen.handleFile()
  ├─ POST /api/excel   →  route.ts signs request (AWS V4)
  │                        └─ PUT to Linode S3 bucket
  │
  └─ processWorkbook() (browser, lib/excel-processor.ts)
       └─ SheetJS reads ArrayBuffer → SheetData (Record<sheetName, rows[][]>)
              │
              ▼
       page.tsx sets sheetData state
              │
         ┌────┴────┐
         ▼         ▼
    KpiCards   ChartsDashboard   DataViewer
    (findRowValue)  (findRow)    (formatCell)
```

**Or – load from S3:**

```
UploadScreen.loadFromS3()
  └─ GET /api/excel  →  route.ts downloads from Linode → base64 JSON response
       └─ browser decodes base64 → processWorkbook() → same flow above
```

---

## Supported Excel Sheets

The following sheet names are explicitly configured in `lib/sheet-config.ts`. Unknown sheets in the workbook are still loaded but rendered with generic defaults.

| Sheet Name (exact) | Short Label | Header Rows | Title Rows |
|---|---|---|---|
| `IAV P&L NOV 2025` | P&L Nov-25 | 6 | 2 |
| `% Sheet` | % Analysis | 2 | 1 |
| `COMPARATIVE %` | Comparative % | 3 | 1 |
| `IAV GROUP MONT. COMPARATIVE P&L` | Group Comparative | 4 | 2 |
| `AMAZON MONTHLY COMPARATIVE P&L` | Amazon Monthly | 4 | 2 |
| `AMAZON QTRLY COMPARATIVE P&L` | Amazon Quarterly | 4 | 2 |
| `ORDERS SHEET` | Orders | 4 | 1 |
| `AMAZON STATEWISE P&L` | Amazon Statewise | 3 | 2 |
| `STATEWISE SALE ` | Statewise Sale | 2 | 1 |
| `STOCK VALUE` | Stock Value | 1 | 0 |
| `AMAZON EXP SHEET` | Amazon Expenses | 3 | 1 |
| `FLIPKART EXP SHEET` | Flipkart Expenses | 3 | 1 |

> **Tip:** Sheet names must match exactly (including trailing spaces). See `SHEET_CONFIG` in `lib/sheet-config.ts`.

---

## Sales Channels

```ts
// lib/sheet-config.ts
export const CHANNELS = [
  "AMAZON.IN",         // #5b9cf5 (blue)
  "FLIPKART",          // #fb923c (orange)
  "MYNTRA",            // #a78bfa (purple)
  "INDIAN ART VILLA.IN", // #3dd68c (green)
  "BULK DOMESTIC",     // #22d3ee (cyan)
  "INDIAN ART VILLA.COM", // #ef6060 (red)
  "BULK EXPORT",       // #d4a853 (gold)
];
```

Chart colours are assigned by array position, matching the column order in the `% Sheet`.

---

## Component Reference

### `UploadScreen` (`components/upload-screen.tsx`)

| Prop | Type | Description |
|---|---|---|
| `onDataLoaded` | `(data: SheetData) => void` | Callback fired after successful parse |

**Internal state:**
- `status` — status message string
- `isError` — toggles error text colour
- `loading` — shows spinner and disables buttons
- `dragOver` — highlights drop zone border

---

### `KpiCards` (`components/kpi-cards.tsx`)

| Prop | Type | Description |
|---|---|---|
| `data` | `SheetData` | Full workbook data map |

Reads from `IAV P&L NOV 2025`, `ORDERS SHEET`, and `STOCK VALUE` sheets via `findRowValue()`.

---

### `ChartsDashboard` (`components/charts-dashboard.tsx`)

| Prop | Type | Description |
|---|---|---|
| `data` | `SheetData` | Full workbook data map |

Conditionally renders each chart only if the underlying data is non-zero. Uses a `ChartCard` sub-component and `CustomTooltip` with INR/percentage formatters.

---

### `DataViewer` (`components/data-viewer.tsx`)

| Prop | Type | Description |
|---|---|---|
| `data` | `SheetData` | Full workbook data map |

**Features:**
- Tab per sheet using shortened labels from `SHEET_CONFIG`
- Metadata bar (row count, column count)
- Debounce-free search with `highlightText()` highlighting
- `getRowClass()` classifies each row as `title | header | section | total | data`
- Sticky first column (CSS `left-0 z-[1]`) and sticky header (`top-0 z-[5]`)

---

### `TopBar` (`components/top-bar.tsx`)

Displays the company name, the detected reporting period (e.g. "NOV 2025"), and the load timestamp.

---

### `ThemeToggle` (`components/theme-toggle.tsx`)

Cycles dark → light → system. Uses `next-themes` `useTheme` hook.

---

## Library Reference (`lib/`)

### `data-helpers.ts`

| Export | Signature | Description |
|---|---|---|
| `CellValue` | `type` | Union of all possible cell value types |
| `SheetRow` | `type = CellValue[]` | One row of data |
| `SheetData` | `type = Record<string, SheetRow[]>` | All sheets keyed by sheet name |
| `findRow` | `(sheet, text) => SheetRow \| null` | First row whose first cell contains `text` (case-insensitive) |
| `findRowValue` | `(sheet, text, colIndex) => number \| null` | Numeric value at `colIndex` in the matching row |
| `fmtINR` | `(n) => string` | Formats number as ₹ with Cr/L suffix for large values |
| `fmtPct` | `(n) => string` | Formats fraction as percentage string (e.g. `0.123` → `"12.3%"`) |
| `detectPeriod` | `(sheetNames) => string` | Extracts month-year from sheet names (e.g. "NOV 2025") |
| `isSection` | `(row, maxCols) => boolean` | Detects section header rows (mostly empty after first cell) |
| `isTotal` | `(row) => boolean` | Detects total/summary rows by first cell keyword |
| `formatCell` | `(val) => { text, type }` | Returns display string and semantic type (`pos`, `neg`, `pct`, `err`) |

### `excel-processor.ts`

| Export | Signature | Description |
|---|---|---|
| `processWorkbook` | `(data: ArrayBuffer) => SheetData` | Reads workbook with SheetJS, applies `hiddenRows` filter from `SHEET_CONFIG`, returns all sheets |

### `sheet-config.ts`

| Export | Description |
|---|---|
| `SheetCfg` | Interface: `{ short, hdrRows, titleRows, hiddenRows }` |
| `SHEET_CONFIG` | Map of exact sheet names → config |
| `CHANNELS` | Ordered array of 7 sales channel names |
| `CHANNEL_COLORS` | Matching colour hex array for charts |

### `utils.ts`

Re-exports `cn()` from `clsx` + `tailwind-merge` for conditional Tailwind class composition.

---

## API Route (`/api/excel`)

File: `app/api/excel/route.ts`

### `POST /api/excel` — Upload file to Linode S3

Accepts `multipart/form-data` with a `file` field. Signs a `PUT` request to Linode using **AWS Signature Version 4** (custom implementation — no AWS SDK dependency).

**Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully to Linode Object Storage",
  "fileName": "data.xlsx",
  "size": 123456,
  "uploadedAt": "2025-11-01T08:00:00.000Z"
}
```

**Error responses:** `400` (no file / wrong type), `500` (Linode error)

---

### `GET /api/excel` — Download file from Linode S3

Signs a `GET` request. Returns the file content as a base64 string.

**Response (200):**
```json
{
  "success": true,
  "data": "<base64-encoded file content>",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "lastModified": "Fri, 01 Nov 2025 08:00:00 GMT",
  "size": 123456
}
```

**Error responses:** `404` (no file), `500` (Linode error)

---

### Signature V4 Implementation

The route implements the full [AWS Signature V4](https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html) signing algorithm using Node.js's built-in `crypto` module:

1. `hmacSHA256(key, data)` — HMAC helper
2. `sha256Hex(data)` — SHA-256 hex digest
3. `getSignatureKey(...)` — derives signing key: `HMAC(HMAC(HMAC(HMAC("AWS4" + secret, date), region), service), "aws4_request")`
4. `signRequest(...)` — builds canonical request, string-to-sign, and `Authorization` header

---

## Theming & Design System

All visual tokens are CSS custom properties defined in `app/globals.css`:

| Token | Purpose |
|---|---|
| `--gold` / `--gold-dim` | Primary accent (KPI highlights, active tabs, total rows) |
| `--blue` / `--blue-dim` | Secondary accent (COGS, percentage cells) |
| `--green` / `--green-dim` | Positive values, gross margin |
| `--red` / `--red-dim` | Negative values, return rate |
| `--surface` / `--surface2` / `--bg2` | Layered background surfaces |
| `--text2` | Secondary text (labels, axis ticks) |
| `--chart-1` … `--chart-5` | Recharts series colours |

Dark and light modes are managed by `next-themes` with `attribute="class"` on `<html>`.
