"use client";

import { useState, useCallback, useEffect } from "react";
import { BarChart3, Table2, GitCompareArrows, X, Check, Loader2, StickyNote } from "lucide-react";
import { UploadScreen } from "@/components/upload-screen";
import { LoginScreen } from "@/components/login-screen";
import { NotesPanel } from "@/components/notes-panel";
import { isLoggedIn, logout, saveLastMonth, getLastMonth } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { KpiCards } from "@/components/kpi-cards";
import { ChartsDashboard } from "@/components/charts-dashboard";
import { DataViewer } from "@/components/data-viewer";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { ComparisonDataViewer } from "@/components/comparison-data-viewer";
import { detectPeriod, keyToPeriod } from "@/lib/data-helpers";
import type { SheetData } from "@/lib/data-helpers";
import type { MonthInfo } from "@/components/month-selector";

export type DrillDown = {
  sheet: string;
  searchTerm: string;
  colIndex?: number;
};

type ViewMode = "dashboard" | "data";

export default function Home() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  // null = not yet hydrated (avoids flash), true/false = known state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  // true while silently auto-loading the last month on refresh
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount — persists across refreshes
    setAuthenticated(isLoggedIn());
  }, []);

  // Auto-load last month when user refreshes while logged in
  useEffect(() => {
    if (!authenticated) return;       // not logged in or not yet known
    const lastKey = getLastMonth();
    if (!lastKey) return;             // no previous session to restore
    setAutoLoading(true);
    fetch(`/api/excel?month=${lastKey}`)
      .then(r => r.json())
      .then(async result => {
        if (!result.data) return;
        const { processWorkbook } = await import("@/lib/excel-processor");
        const bin = atob(result.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const sheets = processWorkbook(bytes.buffer);
        setSheetData(sheets);
        setMonthCache(prev => ({ ...prev, [lastKey]: sheets }));
        setActiveMonthKey(lastKey);
        setLoadedAt("Restored: " + new Date().toLocaleString("en-IN"));
      })
      .catch(() => {/* silently fail — user will see upload screen */})
      .finally(() => setAutoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleLogout = useCallback(() => {
    logout();
    setAuthenticated(false);
    setAutoLoading(false);
    setSheetData(null);
    setActiveMonthKey("");
    setMonthCache({});
    setCompareMode(false);
    setActiveCompareMonths([]);
    setSelectedForCompare([]);
    setNotesOpen(false);
  }, []);

  // ── Dashboard state ───────────────────────────────────────────────────────
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [view, setView] = useState<ViewMode>("dashboard");
  const [loadedAt, setLoadedAt] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  // Multi-month state
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [activeMonthKey, setActiveMonthKey] = useState<string>("");
  const [monthCache, setMonthCache] = useState<Record<string, SheetData>>({});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [comparePickerOpen, setComparePickerOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [activeCompareMonths, setActiveCompareMonths] = useState<string[]>([]);
  const [compareView, setCompareView] = useState<"dashboard" | "data">("dashboard");
  const [loadingCompare, setLoadingCompare] = useState(false);
  // Notes panel state
  const [notesOpen, setNotesOpen] = useState(false);
  // compareData is a subset of monthCache
  const compareData: Record<string, SheetData> = {};
  for (const mk of activeCompareMonths) {
    if (monthCache[mk]) compareData[mk] = monthCache[mk];
  }

  // Load list of available months on mount
  const fetchMonthList = useCallback(async () => {
    try {
      const res = await fetch("/api/excel/list");
      const data = await res.json();
      if (data.success) setAvailableMonths(data.months);
    } catch (err) {
      console.error("Failed to fetch month list:", err);
    }
  }, []);

  useEffect(() => { fetchMonthList(); }, [fetchMonthList]);

  // Fetch a month's data (returns SheetData or null)
  const fetchMonthData = useCallback(async (monthKey: string): Promise<SheetData | null> => {
    if (monthCache[monthKey]) return monthCache[monthKey];
    try {
      const res = await fetch(`/api/excel?month=${monthKey}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch");
      const { processWorkbook } = await import("@/lib/excel-processor");
      const binaryStr = atob(result.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const sheets = processWorkbook(bytes.buffer);
      setMonthCache(prev => ({ ...prev, [monthKey]: sheets }));
      return sheets;
    } catch {
      return null;
    }
  }, [monthCache]);

  // Handle single month switch
  const handleMonthChange = useCallback(async (monthKey: string) => {
    if (monthKey === activeMonthKey) return;
    if (monthCache[monthKey]) {
      setSheetData(monthCache[monthKey]);
      setActiveMonthKey(monthKey);
      setDrillDown(null);
      saveLastMonth(monthKey);
      setLoadedAt("Restored from cache: " + new Date().toLocaleString("en-IN"));
      return;
    }
    setLoadingMonth(monthKey);
    try {
      const sheets = await fetchMonthData(monthKey);
      if (sheets) {
        setSheetData(sheets);
        setActiveMonthKey(monthKey);
        setDrillDown(null);
        saveLastMonth(monthKey);
        setLoadedAt("Loaded from S3: " + new Date().toLocaleString("en-IN"));
      }
    } catch (err) {
      console.error("Error switching month:", err);
    } finally {
      setLoadingMonth(null);
    }
  }, [activeMonthKey, monthCache, fetchMonthData]);

  const handleDataLoaded = useCallback((data: SheetData) => {
    const period = detectPeriod(Object.keys(data));
    import("@/lib/data-helpers").then(({ periodToKey }) => {
      const key = periodToKey(period);
      setSheetData(data);
      setMonthCache(prev => ({ ...prev, [key]: data }));
      setActiveMonthKey(key);
      saveLastMonth(key);
      setLoadedAt("Loaded: " + new Date().toLocaleString("en-IN"));
      fetchMonthList();
    });
  }, [fetchMonthList]);

  const handleDrillDown = useCallback((d: DrillDown) => {
    setDrillDown(d);
    setView("data");
  }, []);

  const handleBack = useCallback(() => {
    setDrillDown(null);
    setView("dashboard");
  }, []);

  const handleTabSwitch = useCallback((newView: ViewMode) => {
    setView(newView);
    if (newView === "dashboard") setDrillDown(null);
  }, []);

  // Toggle a month in the compare picker
  const toggleCompareSelection = (mk: string) => {
    setSelectedForCompare(prev =>
      prev.includes(mk) ? prev.filter(m => m !== mk) : [...prev, mk]
    );
  };

  // Apply compare selection
  const applyCompare = async () => {
    if (selectedForCompare.length < 2) return;
    setLoadingCompare(true);
    // Load any uncached months
    for (const mk of selectedForCompare) {
      await fetchMonthData(mk);
    }
    setActiveCompareMonths([...selectedForCompare]);
    setCompareMode(true);
    setComparePickerOpen(false);
    setLoadingCompare(false);
  };

  const exitCompare = () => {
    setCompareMode(false);
    setActiveCompareMonths([]);
    setSelectedForCompare([]);
  };

  // Auth gate — must come after all hook declarations
  if (authenticated === null || autoLoading) {
    // Still reading localStorage or silently restoring last session
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
          <p className="text-sm text-muted-foreground">{authenticated ? "Restoring your session..." : ""}</p>
        </div>
      </div>
    );
  }
  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  if (!sheetData) {
    return <UploadScreen onDataLoaded={handleDataLoaded} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar
        months={availableMonths}
        activeMonth={activeMonthKey}
        onMonthChange={compareMode ? () => {} : handleMonthChange}
        loadingMonth={loadingMonth}
        loadedAt={loadedAt}
        onLogout={handleLogout}
      />

      {/* View toggle bar */}
      <div className="flex items-center gap-2 px-7 py-2.5 bg-[var(--bg2)] border-b border-border sticky top-[59px] z-40 flex-wrap">
        {!compareMode ? (
          <>
            <button
              onClick={() => handleTabSwitch("dashboard")}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${view === "dashboard" ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => handleTabSwitch("data")}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${view === "data" ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"}`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Data Viewer
            </button>

            {/* Compare trigger */}
            <div className="relative">
              <button
                onClick={() => { setComparePickerOpen(v => !v); setSelectedForCompare([]); }}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${comparePickerOpen ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"}`}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                Compare Months
              </button>

              {comparePickerOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border bg-[var(--surface)] shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-xs font-semibold text-foreground">Select months to compare</span>
                    <button onClick={() => setComparePickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {availableMonths.map((m) => {
                      const sel = selectedForCompare.includes(m.monthKey);
                      return (
                        <button
                          key={m.monthKey}
                          onClick={() => toggleCompareSelection(m.monthKey)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${sel ? "bg-[var(--gold)] text-white border-[var(--gold)] shadow-sm" : "bg-[var(--surface2)] text-muted-foreground border-border hover:border-[var(--gold)] hover:text-[var(--gold)]"}`}
                        >
                          {sel && <Check className="h-2.5 w-2.5" />}
                          {m.period}
                        </button>
                      );
                    })}
                    {availableMonths.length === 0 && (
                      <p className="text-xs text-muted-foreground w-full text-center py-2">No months available</p>
                    )}
                  </div>
                  <div className="px-3 pb-3">
                    <button
                      disabled={selectedForCompare.length < 2 || loadingCompare}
                      onClick={applyCompare}
                      className="w-full h-9 rounded-lg text-xs font-semibold bg-gradient-to-br from-[var(--gold)] to-[var(--primary)] text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
                    >
                      {loadingCompare ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...</> : <>
                        <GitCompareArrows className="h-3.5 w-3.5" />
                        Compare {selectedForCompare.length >= 2 ? `${selectedForCompare.length} months` : "(pick â‰¥2)"}
                      </>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Compare mode tabs */
          <>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--gold-dim)] border border-[rgba(212,168,83,0.2)] text-[var(--gold)] text-xs font-semibold">
              <GitCompareArrows className="h-3.5 w-3.5" />
              Comparing: {activeCompareMonths.map(mk => keyToPeriod(mk)).join(" vs ")}
            </div>
            <button
              onClick={() => setCompareView("dashboard")}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${compareView === "dashboard" ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Comparison Dashboard
            </button>
            <button
              onClick={() => setCompareView("data")}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${compareView === "data" ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"}`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Comparison Data
            </button>
            <button
              onClick={exitCompare}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-[var(--surface)] transition-all"
            >
              <X className="h-3 w-3" />
              Exit Compare
            </button>
          </>
        )}

        {/* Notes button — always visible on the right */}
        <div className="ml-auto flex items-center gap-3">
          {!compareMode && loadingMonth && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-2 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
              Synchronizing data...
            </div>
          )}
          <button
            onClick={() => setNotesOpen(true)}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              notesOpen
                ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]"
                : "text-muted-foreground border-border hover:text-[var(--gold)] hover:bg-[var(--gold-dim)] hover:border-[rgba(212,168,83,0.2)]"
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </button>
        </div>
      </div>

      {/* â”€â”€ Normal views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!compareMode && view === "dashboard" && (
        <div className={`p-6 lg:px-7 transition-opacity duration-300 ${loadingMonth ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <KpiCards data={sheetData} onDrillDown={handleDrillDown} />
          <ChartsDashboard data={sheetData} onDrillDown={handleDrillDown} />
        </div>
      )}
      {!compareMode && view === "data" && (
        <div className={`transition-opacity duration-300 ${loadingMonth ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <DataViewer data={sheetData} drillDown={drillDown} onBack={drillDown ? handleBack : undefined} />
        </div>
      )}

      {/* â”€â”€ Compare views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {compareMode && compareView === "dashboard" && (
        <div className="p-6 lg:px-7">
          <ComparisonDashboard compareData={compareData} months={activeCompareMonths} />
        </div>
      )}
      {compareMode && compareView === "data" && (
        <div className="h-[calc(100vh-120px)] flex flex-col">
          <ComparisonDataViewer compareData={compareData} months={activeCompareMonths} />
        </div>
      )}
      {/* Notes slide-over panel */}
      <NotesPanel
        availableMonths={availableMonths}
        activeMonthKey={activeMonthKey}
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
      />
    </div>
  );
}
