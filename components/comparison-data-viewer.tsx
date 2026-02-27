"use client";

import { useState, useMemo } from "react";
import type { SheetData, SheetRow } from "@/lib/data-helpers";
import { formatCell, isSection, isTotal, findSheetByShortKey, getShortKeys, keyToPeriod } from "@/lib/data-helpers";
import { SHEET_CONFIG } from "@/lib/sheet-config";

interface ComparisonDataViewerProps {
  compareData: Record<string, SheetData>;
  months: string[]; // ordered monthKeys
}

const MONTH_COLORS = ["#5b9cf5", "#d4a853", "#3dd68c", "#fb923c", "#a78bfa", "#ef6060", "#22d3ee"];

function monthLabel(key: string) { return keyToPeriod(key); }

function getRowClass(row: SheetRow, rowIdx: number, titleCount: number, hdrCount: number, maxCols: number): string {
  if (rowIdx < titleCount) return "title";
  if (rowIdx < hdrCount) return "header";
  if (row.every((c) => c === "" || c === null || c === undefined)) return "empty";
  const first = String(row[0] || "").trim();
  if (!first) {
    let empties = 0;
    for (let i = 1; i < Math.min(row.length, maxCols); i++) {
      if (row[i] === "" || row[i] === null || row[i] === undefined) empties++;
    }
    if (empties >= Math.min(row.length, maxCols) - 2) return "section";
  }
  if (isTotal(row)) return "total";
  if (isSection(row, maxCols)) return "section";
  return "data";
}

export function ComparisonDataViewer({ compareData, months }: ComparisonDataViewerProps) {
  // Collect all stable short keys present across all months
  const allShortKeys = useMemo(() => {
    const sets = months.map((mk) => new Set(getShortKeys(compareData[mk] || {})));
    // keys present in at least one month
    const union = new Set<string>();
    sets.forEach((s) => s.forEach((k) => union.add(k)));
    return Array.from(union);
  }, [compareData, months]);

  const [activeShortKey, setActiveShortKey] = useState(allShortKeys[0] || "");

  // Config for this sheet
  const cfgKey = Object.keys(SHEET_CONFIG).find(
    (k) => k === activeShortKey || k.startsWith(activeShortKey.replace("IAV P&L", "IAV P&L"))
  );
  const cfg = cfgKey ? SHEET_CONFIG[cfgKey] : { hdrRows: 1, titleRows: 0, short: activeShortKey, hiddenRows: [] };

  // Get rows for each month for the active short key
  const rowsByMonth = useMemo(() =>
    months.map((mk) => findSheetByShortKey(compareData[mk] || {}, activeShortKey)),
    [compareData, months, activeShortKey]
  );

  // Use first month with data as the "template" for row labels
  const templateRows: SheetRow[] = rowsByMonth.find((r) => r.length > 0) || [];
  const hdrCount = (cfg.hdrRows || 1) + (cfg.titleRows || 0);
  const maxCols = templateRows.reduce((m, r) => Math.max(m, r.length), 0);

  // Build a map: rowIndex -> rows across months (aligned by index)
  // Only include non-hidden, non-empty rows
  const hiddenSet = new Set<number>((cfg.hiddenRows || []));

  const displayRows = useMemo(() => {
    return templateRows.map((row, ri) => ({
      ri,
      row,
      rowsByMonth: rowsByMonth.map((mRows) => mRows[ri] || []),
      cls: getRowClass(row, ri, cfg.titleRows || 0, (cfg.titleRows || 0) + (cfg.hdrRows || 1), maxCols),
    })).filter(({ ri, row, cls }) => {
      if (hiddenSet.has(ri)) return false;
      if (cls === "empty") return false;
      return true;
    });
  }, [templateRows, rowsByMonth, cfg, maxCols, hiddenSet]);

  if (months.length < 2) {
    return <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Select at least 2 months to compare.</div>;
  }

  // Columns to show per month (skip index 0 = label; show TOTAL + first % col typically 2 cols)
  // We'll show columns 1 and 2 (or 1 only if the sheet has few columns)
  const colsPerMonth = maxCols >= 3 ? 2 : 1;

  // Header rows from template
  const headerRows = templateRows.slice(0, (cfg.titleRows || 0) + (cfg.hdrRows || 1));

  return (
    <div className="flex flex-col h-full">
      {/* Sheet tabs */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-[var(--bg2)] overflow-x-auto scrollbar-none">
        {allShortKeys.map((sk) => {
          const cfgEntry = Object.values(SHEET_CONFIG).find(
            (c) => Object.keys(SHEET_CONFIG).some((k) => (k === sk || k.startsWith(sk.replace("IAV P&L", "IAV P&L"))) && SHEET_CONFIG[k] === c)
          );
          const label = cfgEntry?.short ?? sk;
          const isActive = sk === activeShortKey;
          return (
            <button
              key={sk}
              onClick={() => setActiveShortKey(sk)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap transition-all border
                ${isActive
                  ? "bg-[var(--gold-dim)] text-[var(--gold)] border-[rgba(212,168,83,0.2)]"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-[var(--surface)] flex-wrap">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Months:</span>
        {months.map((mk, mi) => (
          <span key={mk} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: MONTH_COLORS[mi % MONTH_COLORS.length] }}>
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: MONTH_COLORS[mi % MONTH_COLORS.length] }} />
            {monthLabel(mk)}
          </span>
        ))}
        {colsPerMonth === 2 && (
          <span className="text-[10px] text-muted-foreground ml-auto">Showing: Value · %</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        {displayRows.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No data for this sheet across selected months.
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--surface)]">
              {/* Month group header */}
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground font-semibold border-r border-border min-w-[200px] bg-[var(--surface)]">
                  Row / Metric
                </th>
                {months.map((mk, mi) => (
                  <th
                    key={mk}
                    colSpan={colsPerMonth}
                    className="px-3 py-2 text-center font-bold border-r border-border/50"
                    style={{ color: MONTH_COLORS[mi % MONTH_COLORS.length], background: `${MONTH_COLORS[mi % MONTH_COLORS.length]}18` }}
                  >
                    {monthLabel(mk)}
                  </th>
                ))}
                {months.length === 2 && (
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground bg-[var(--surface)] whitespace-nowrap">
                    Δ Change
                  </th>
                )}
              </tr>

              {/* Sub-header from data (if excel has column headers) */}
              {headerRows.length > 0 && (
                <tr className="border-b border-border bg-[var(--surface2)]">
                  <th className="text-left px-4 py-1.5 text-muted-foreground font-medium border-r border-border" />
                  {months.map((mk, mi) => {
                    const hRow = rowsByMonth[mi]?.[hdrCount - 1] || [];
                    return Array.from({ length: colsPerMonth }).map((_, ci) => (
                      <th
                        key={`${mk}-${ci}`}
                        className={`px-3 py-1.5 text-right font-medium text-muted-foreground ${ci === colsPerMonth - 1 ? "border-r border-border/50" : ""}`}
                      >
                        {ci === 0 ? (String(hRow[1] || "₹")).substring(0, 4) : "%"}
                      </th>
                    ));
                  })}
                  {months.length === 2 && <th className="px-3 py-1.5" />}
                </tr>
              )}
            </thead>
            <tbody>
              {displayRows.map(({ ri, row, rowsByMonth: mRows, cls }) => {
                const label = String(row[0] || "").trim();

                // Compute change (col 1 across first 2 months)
                let changePct: number | null = null;
                if (months.length === 2) {
                  const v0 = typeof mRows[0]?.[1] === "number" ? (mRows[0][1] as number) : null;
                  const v1 = typeof mRows[1]?.[1] === "number" ? (mRows[1][1] as number) : null;
                  if (v0 !== null && v1 !== null && v1 !== 0) {
                    changePct = ((v0 - v1) / Math.abs(v1)) * 100;
                  }
                }

                const isHdr = cls === "header" || cls === "title";
                const isSec = cls === "section";
                const isTot = cls === "total";

                const rowClass = [
                  "border-b border-border/40 transition-colors",
                  isSec ? "bg-muted/30" : "",
                  isTot ? "bg-[var(--gold-dim)]/30 font-semibold" : "",
                  isHdr ? "bg-[var(--surface2)] font-bold" : "",
                  !isHdr && !isSec && !isTot ? "hover:bg-muted/20" : "",
                ].join(" ");

                return (
                  <tr key={ri} className={rowClass}>
                    {/* Row label */}
                    <td className={`px-4 py-2 border-r border-border ${isSec ? "text-[var(--gold)] font-semibold" : isTot ? "text-foreground font-bold" : "text-foreground"}`}
                      style={{ paddingLeft: isSec || isTot || isHdr ? undefined : "1.25rem" }}>
                      {label}
                    </td>

                    {/* Values per month */}
                    {months.map((mk, mi) => {
                      const mRow = mRows[mi] || [];
                      return Array.from({ length: colsPerMonth }).map((_, ci) => {
                        const colIdx = ci + 1;
                        const raw = mRow[colIdx];
                        const { text, type } = formatCell(raw);
                        const isLast = ci === colsPerMonth - 1;
                        return (
                          <td
                            key={`${mk}-${ci}`}
                            className={`px-3 py-2 text-right font-mono tabular-nums ${isLast ? "border-r border-border/40" : ""} ${type === "neg" ? "text-[var(--red)]" : type === "pos" ? "text-[var(--green)]" : type === "pct" ? "text-[var(--chart-4)]" : "text-foreground"}`}
                          >
                            {text}
                          </td>
                        );
                      });
                    })}

                    {/* Change column */}
                    {months.length === 2 && (
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {changePct !== null ? (
                          <span className={`font-semibold text-[11px] ${changePct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                            {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
