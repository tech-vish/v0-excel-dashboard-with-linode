import * as XLSX from "xlsx";
import { SHEET_CONFIG } from "./sheet-config";
import type { SheetData } from "./data-helpers";

export function processWorkbook(data: ArrayBuffer): SheetData {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const allSheets: SheetData = {};

  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    const json: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
    });

    const cfg = SHEET_CONFIG[name] || { hiddenRows: [] };
    const hidden = new Set(cfg.hiddenRows.map((r) => r - 1));
    const filtered = json.filter((_, i) => !hidden.has(i));

    allSheets[name] = filtered;
  });

  return allSheets;
}
