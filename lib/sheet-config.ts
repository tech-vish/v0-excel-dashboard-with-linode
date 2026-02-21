export interface SheetCfg {
  short: string;
  hdrRows: number;
  titleRows: number;
  hiddenRows: number[];
}

export const SHEET_CONFIG: Record<string, SheetCfg> = {
  "IAV P&L NOV 2025": {
    short: "P&L Nov-25",
    hdrRows: 6,
    titleRows: 2,
    hiddenRows: [19],
  },
  "% Sheet": {
    short: "% Analysis",
    hdrRows: 2,
    titleRows: 1,
    hiddenRows: [],
  },
  "COMPARATIVE %": {
    short: "Comparative %",
    hdrRows: 3,
    titleRows: 1,
    hiddenRows: [],
  },
  "IAV GROUP MONT. COMPARATIVE P&L": {
    short: "Group Comparative",
    hdrRows: 4,
    titleRows: 2,
    hiddenRows: [],
  },
  "AMAZON MONTHLY COMPARATIVE P&L": {
    short: "Amazon Monthly",
    hdrRows: 4,
    titleRows: 2,
    hiddenRows: [],
  },
  "AMAZON QTRLY COMPARATIVE P&L": {
    short: "Amazon Quarterly",
    hdrRows: 4,
    titleRows: 2,
    hiddenRows: [],
  },
  "ORDERS SHEET": {
    short: "Orders",
    hdrRows: 4,
    titleRows: 1,
    hiddenRows: [12, 13, 14, 15, 16],
  },
  "AMAZON STATEWISE P&L": {
    short: "Amazon Statewise",
    hdrRows: 3,
    titleRows: 2,
    hiddenRows: [],
  },
  "STATEWISE SALE ": {
    short: "Statewise Sale",
    hdrRows: 2,
    titleRows: 1,
    hiddenRows: [],
  },
  "STOCK VALUE": {
    short: "Stock Value",
    hdrRows: 1,
    titleRows: 0,
    hiddenRows: [],
  },
  "AMAZON EXP SHEET": {
    short: "Amazon Expenses",
    hdrRows: 3,
    titleRows: 1,
    hiddenRows: [],
  },
  "FLIPKART EXP SHEET": {
    short: "Flipkart Expenses",
    hdrRows: 3,
    titleRows: 1,
    hiddenRows: [],
  },
};

export const CHANNELS = [
  "AMAZON.IN",
  "FLIPKART",
  "MYNTRA",
  "INDIAN ART VILLA.IN",
  "BULK DOMESTIC",
  "INDIAN ART VILLA.COM",
  "BULK EXPORT",
];

export const CHANNEL_COLORS = [
  "#5b9cf5",
  "#fb923c",
  "#a78bfa",
  "#3dd68c",
  "#22d3ee",
  "#ef6060",
  "#d4a853",
];
