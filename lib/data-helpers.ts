export type CellValue = string | number | Date | null | undefined | boolean;
export type SheetRow = CellValue[];
export type SheetData = Record<string, SheetRow[]>;

export function findRow(
  sheetData: SheetRow[],
  searchText: string
): SheetRow | null {
  const lower = searchText.toLowerCase().trim();
  for (let i = 0; i < sheetData.length; i++) {
    const cell = String(sheetData[i][0] || "")
      .toLowerCase()
      .trim();
    if (cell.includes(lower)) return sheetData[i];
  }
  return null;
}

export function findRowValue(
  sheetData: SheetRow[],
  searchText: string,
  colIndex: number
): number | null {
  const row = findRow(sheetData, searchText);
  if (!row) return null;
  const val = row[colIndex];
  if (val === "" || val === null || val === undefined) return null;
  if (typeof val === "string" && val.startsWith("#")) return null;
  return typeof val === "number" ? val : null;
}

export function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 10000000) s = (n / 10000000).toFixed(2) + " Cr";
  else if (abs >= 100000) s = (n / 100000).toFixed(2) + " L";
  else s = n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return (n < 0 ? "-\u20B9" : "\u20B9") + s.replace("-", "");
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  return (n * 100).toFixed(1) + "%";
}

export function detectPeriod(sheetNames: string[]): string {
  for (const n of sheetNames) {
    const match = n.match(
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/i
    );
    if (match) return match[1].toUpperCase() + " " + match[2];
  }
  return "Financial Summary";
}

export function isSection(row: SheetRow, maxCols: number): boolean {
  const first = String(row[0] || "").trim();
  if (!first) return false;
  let empties = 0;
  for (let i = 1; i < Math.min(row.length, maxCols); i++) {
    if (row[i] === "" || row[i] === null || row[i] === undefined) empties++;
  }
  return empties >= Math.min(row.length, maxCols) - 2;
}

export function isTotal(row: SheetRow): boolean {
  const f = String(row[0] || "")
    .trim()
    .toLowerCase();
  return (
    f.startsWith("total") ||
    f.startsWith("net sale") ||
    f.startsWith("ebit") ||
    f.startsWith("ebt") ||
    f.startsWith("contribution") ||
    f.startsWith("sales after") ||
    f.startsWith("successfull") ||
    f.startsWith("earnings before")
  );
}

export function formatCell(val: CellValue): { text: string; type: string } {
  if (val === "" || val === null || val === undefined)
    return { text: "", type: "" };

  if (typeof val === "string" && (val.startsWith("#") || val === "-"))
    return { text: "\u2014", type: "err" };

  if (val instanceof Date) {
    const m = val.toLocaleString("en-US", { month: "short" });
    const y = val.getFullYear();
    return { text: m + "-" + y, type: "" };
  }

  if (typeof val === "number") {
    if (
      Math.abs(val) <= 2 &&
      val !== 0 &&
      !Number.isInteger(val) &&
      String(val).split(".").length > 1 &&
      String(val).split(".")[1].length > 3
    ) {
      return { text: (val * 100).toFixed(2) + "%", type: "pct" };
    }
    if (Math.abs(val) >= 100) {
      const fmt =
        val < 0
          ? "-\u20B9" +
            Math.abs(val).toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })
          : "\u20B9" +
            val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      return { text: fmt, type: val < 0 ? "neg" : "pos" };
    }
    return {
      text: val.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      type: val < 0 ? "neg" : val > 0 ? "pos" : "",
    };
  }

  return { text: String(val), type: "" };
}
