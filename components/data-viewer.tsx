"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { SHEET_CONFIG } from "@/lib/sheet-config";
import { formatCell, isSection, isTotal } from "@/lib/data-helpers";
import type { SheetData, SheetRow } from "@/lib/data-helpers";
import type { DrillDown } from "@/app/page";

interface DataViewerProps {
  data: SheetData;
  drillDown?: DrillDown | null;
  onBack?: () => void;
}

function getRowClass(
  rowIndex: number,
  row: SheetRow,
  titleCount: number,
  hdrCount: number,
  maxCols: number
): string {
  if (rowIndex < titleCount) return "title";
  if (rowIndex < hdrCount) return "header";
  if (isSection(row, maxCols)) return "section";
  if (isTotal(row)) return "total";
  return "data";
}

function highlightText(text: string, term: string): React.ReactNode {
  if (!term || !text) return text;
  const regex = new RegExp(
    `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        className="bg-[var(--gold-dim)] text-foreground rounded-sm px-0.5"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function DataViewer({ data, drillDown, onBack }: DataViewerProps) {
  const sheetNames = useMemo(() => Object.keys(data), [data]);
  const [activeTab, setActiveTab] = useState(sheetNames[0] || "");
  const [searchTerm, setSearchTerm] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  // Track which row index is the "highlight" target and fade it out
  const [highlightRowIdx, setHighlightRowIdx] = useState<number | null>(null);
  const highlightColIdx = drillDown?.colIndex ?? null;
  const highlightFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  // When data changes (month switch), reset activeTab to a valid sheet.
  // The P&L sheet key contains the month name so it changes every month.
  useEffect(() => {
    setActiveTab((prev) => {
      if (sheetNames.includes(prev)) return prev; // still valid, keep it
      return sheetNames[0] || "";               // stale key → reset to first sheet
    });
    setSearchTerm("");
    setHighlightRowIdx(null);
  }, [sheetNames]);

  // Apply drill-down when the prop changes
  useEffect(() => {
    if (!drillDown) return;

    // Switch to the correct tab
    const targetSheet = sheetNames.includes(drillDown.sheet)
      ? drillDown.sheet
      : sheetNames[0];
    setActiveTab(targetSheet);
    setSearchTerm(drillDown.searchTerm);

    // Clear any previous highlight timer
    if (highlightFadeTimer.current) clearTimeout(highlightFadeTimer.current);

    // Fade highlight after 2.5 s
    highlightFadeTimer.current = setTimeout(() => {
      setHighlightRowIdx(null);
    }, 2500);

    return () => {
      if (highlightFadeTimer.current) clearTimeout(highlightFadeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDown]);

  // After the list renders, locate and scroll to the first matching row
  const rows = data[activeTab] || [];
  const cfg = SHEET_CONFIG[activeTab] || {
    hdrRows: 1,
    titleRows: 0,
    short: activeTab,
  };
  const hdrCount = cfg.hdrRows || 1;
  const titleCount = cfg.titleRows || 0;

  const maxCols = useMemo(
    () => rows.reduce((max, r) => Math.max(max, r.length), 0),
    [rows]
  );

  const filteredIndices = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    if (!lower) return rows.map((_, i) => i);
    return rows
      .map((r, i) => {
        if (i < hdrCount + titleCount) return i;
        if (
          r.some((c) =>
            String(c).toLowerCase().includes(lower)
          )
        )
          return i;
        return -1;
      })
      .filter((i) => i >= 0);
  }, [rows, searchTerm, hdrCount, titleCount]);

  // Compute the first non-header matching row index so we can highlight + scroll it
  useEffect(() => {
    if (!drillDown || !searchTerm) return;
    const lower = searchTerm.toLowerCase();
    const firstMatch = rows.findIndex(
      (r, i) =>
        i >= hdrCount + titleCount &&
        r.some((c) => String(c).toLowerCase().includes(lower))
    );
    setHighlightRowIdx(firstMatch >= 0 ? firstMatch : null);
  }, [drillDown, searchTerm, rows, hdrCount, titleCount]);

  // Scroll highlighted row into view after render
  useEffect(() => {
    if (highlightRowRef.current && tableRef.current) {
      setTimeout(() => {
        highlightRowRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 80); // small delay so the tab/search state has settled
    }
  }, [highlightRowIdx, activeTab]);

  const handleTabChange = useCallback((name: string) => {
    setActiveTab(name);
    setSearchTerm("");
    setHighlightRowIdx(null);
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, []);

  if (sheetNames.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No sheets loaded
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Tab Strip */}
      <div className="flex overflow-x-auto bg-[var(--surface)] border-b border-border px-5 gap-0.5 scrollbar-thin">
        {sheetNames.map((name) => {
          const label =
            SHEET_CONFIG[name]?.short || name;
          const isActive = name === activeTab;
          return (
            <button
              key={name}
              onClick={() => handleTabChange(name)}
              className={`relative flex-shrink-0 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors rounded-t-lg ${isActive
                  ? "text-[var(--gold)] bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-[var(--surface2)]"
                }`}
            >
              {label}
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[var(--gold)] rounded-t" />
              )}
            </button>
          );
        })}
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-3.5 px-7 py-2 bg-background border-b border-border text-[11px] text-muted-foreground">
        {/* Back button (only shown after drill-down) */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium
              bg-[var(--gold-dim)] text-[var(--gold)] border border-[rgba(212,168,83,0.25)]
              hover:bg-[rgba(212,168,83,0.2)] transition-colors mr-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </button>
        )}

        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--blue)]" />
          {rows.length} rows
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
          {maxCols} cols
        </span>

        {drillDown && highlightRowIdx !== null && (
          <span className="flex items-center gap-1 text-[var(--gold)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            Source row highlighted
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 bg-[var(--surface2)] border border-border rounded-lg px-3 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-foreground text-xs w-40 placeholder:text-muted-foreground font-sans"
          />
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="flex-1 overflow-auto scrollbar-thin"
        style={{
          scrollbarColor: "var(--border) var(--background)",
        }}
      >
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No data in this sheet
          </div>
        ) : (
          <table className="border-collapse w-max min-w-full text-[12.5px]">
            <tbody>
              {filteredIndices.map((rowIdx) => {
                const row = rows[rowIdx];
                const rowType = getRowClass(
                  rowIdx,
                  row,
                  titleCount,
                  hdrCount,
                  maxCols
                );
                const isHeader = rowType === "header";
                const isHighlighted = rowIdx === highlightRowIdx;

                const trClass =
                  rowType === "title"
                    ? "bg-[var(--surface2)]"
                    : rowType === "header"
                      ? "bg-[var(--surface2)]"
                      : rowType === "section"
                        ? "bg-[var(--surface)]"
                        : rowType === "total"
                          ? "bg-[var(--surface2)] border-t-2 border-t-[var(--gold)]"
                          : isHighlighted
                            ? "bg-[rgba(212,168,83,0.12)] transition-colors duration-700"
                            : rowIdx % 2 === 0
                              ? "bg-[var(--bg2)] hover:bg-[var(--surface)]"
                              : "hover:bg-[var(--surface)]";

                const Tag = isHeader ? "th" : "td";

                return (
                  <tr
                    key={rowIdx}
                    className={trClass}
                    ref={isHighlighted ? (el) => { highlightRowRef.current = el; } : undefined}
                  >
                    {Array.from({ length: maxCols }).map(
                      (_, colIdx) => {
                        const raw =
                          colIdx < row.length
                            ? row[colIdx]
                            : "";
                        const { text, type } =
                          formatCell(raw);

                        // Is this the specifically highlighted cell?
                        const isCellHighlighted =
                          isHighlighted &&
                          highlightColIdx !== null &&
                          colIdx === highlightColIdx;

                        let cellClass =
                          "px-3.5 py-2 border-b border-r border-border whitespace-nowrap text-left max-w-[340px] overflow-hidden text-ellipsis";

                        if (isCellHighlighted) {
                          cellClass +=
                            " ring-2 ring-inset ring-[var(--gold)] rounded-sm";
                        }

                        if (colIdx === 0) {
                          cellClass +=
                            " sticky left-0 z-[1] border-r-2 min-w-[200px] max-w-[360px] font-medium";
                          if (rowType === "title")
                            cellClass +=
                              " bg-[var(--surface2)]";
                          else if (rowType === "header")
                            cellClass +=
                              " bg-[var(--surface2)]";
                          else if (rowType === "section")
                            cellClass +=
                              " bg-[var(--surface)]";
                          else if (rowType === "total")
                            cellClass +=
                              " bg-[var(--surface2)]";
                          else if (isHighlighted)
                            cellClass +=
                              " bg-[rgba(212,168,83,0.12)]";
                          else if (rowIdx % 2 === 0)
                            cellClass +=
                              " bg-[var(--bg2)]";
                          else
                            cellClass +=
                              " bg-background";
                        }

                        if (isHeader) {
                          cellClass +=
                            " text-[var(--gold)] font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-[5] bg-[var(--surface2)]";
                          if (colIdx === 0)
                            cellClass =
                              cellClass.replace(
                                "z-[1]",
                                "z-[10]"
                              );
                        }

                        if (rowType === "title") {
                          cellClass +=
                            " font-bold text-[13px] text-foreground py-3";
                        }

                        if (rowType === "section") {
                          cellClass +=
                            " font-semibold text-[var(--gold)] text-[11.5px] uppercase tracking-wider";
                        }

                        if (rowType === "total") {
                          cellClass += " font-bold";
                        }

                        if (
                          type === "pos" ||
                          type === "neg" ||
                          type === "pct" ||
                          type === "err"
                        ) {
                          cellClass +=
                            " text-right font-mono text-xs";
                        }

                        if (type === "pos")
                          cellClass +=
                            " text-[var(--green)]";
                        if (type === "neg")
                          cellClass +=
                            " text-[var(--red)]";
                        if (type === "pct")
                          cellClass +=
                            " text-[var(--blue)]";
                        if (type === "err")
                          cellClass +=
                            " text-muted-foreground italic";

                        return (
                          <Tag
                            key={colIdx}
                            className={cellClass}
                          >
                            {searchTerm
                              ? highlightText(
                                text,
                                searchTerm
                              )
                              : text}
                          </Tag>
                        );
                      }
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
