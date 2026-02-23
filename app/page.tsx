"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { UploadScreen } from "@/components/upload-screen";
import { TopBar } from "@/components/top-bar";
import { KpiCards } from "@/components/kpi-cards";
import { ChartsDashboard } from "@/components/charts-dashboard";
import { DataViewer } from "@/components/data-viewer";
import { detectPeriod } from "@/lib/data-helpers";
import type { SheetData } from "@/lib/data-helpers";
import type { MonthInfo } from "@/components/month-selector";

export type DrillDown = {
  sheet: string;
  searchTerm: string;
  colIndex?: number;
};

type ViewMode = "dashboard" | "data";

export default function Home() {
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [view, setView] = useState<ViewMode>("dashboard");
  const [loadedAt, setLoadedAt] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  // Multi-month state
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [activeMonthKey, setActiveMonthKey] = useState<string>("");
  const [monthCache, setMonthCache] = useState<Record<string, SheetData>>({});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  // Load list of available months on mount
  const fetchMonthList = useCallback(async () => {
    try {
      const res = await fetch("/api/excel/list");
      const data = await res.json();
      if (data.success) {
        setAvailableMonths(data.months);
      }
    } catch (err) {
      console.error("Failed to fetch month list:", err);
    }
  }, []);

  useEffect(() => {
    fetchMonthList();
  }, [fetchMonthList]);

  // Handle month switch
  const handleMonthChange = useCallback(async (monthKey: string) => {
    if (monthKey === activeMonthKey) return;

    // Check cache
    if (monthCache[monthKey]) {
      setSheetData(monthCache[monthKey]);
      setActiveMonthKey(monthKey);
      setDrillDown(null);
      setLoadedAt("Restored from cache: " + new Date().toLocaleString("en-IN"));
      return;
    }

    // Fetch from S3 via API
    setLoadingMonth(monthKey);
    try {
      const res = await fetch(`/api/excel?month=${monthKey}`);
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to fetch month data");

      // Shared processing logic (DRY later if needed)
      const { processWorkbook } = await import("@/lib/excel-processor");

      const binaryStr = atob(result.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const sheets = processWorkbook(bytes.buffer);

      // Update state and cache
      setSheetData(sheets);
      setMonthCache(prev => ({ ...prev, [monthKey]: sheets }));
      setActiveMonthKey(monthKey);
      setDrillDown(null);
      setLoadedAt("Loaded from S3: " + new Date().toLocaleString("en-IN"));
    } catch (err) {
      console.error("Error switching month:", err);
      // Could add a toast here
    } finally {
      setLoadingMonth(null);
    }
  }, [activeMonthKey, monthCache]);

  const handleDataLoaded = useCallback((data: SheetData) => {
    const period = detectPeriod(Object.keys(data));
    // Import helper to convert period to key
    import("@/lib/data-helpers").then(({ periodToKey }) => {
      const key = periodToKey(period);
      setSheetData(data);
      setMonthCache(prev => ({ ...prev, [key]: data }));
      setActiveMonthKey(key);
      setLoadedAt("Loaded: " + new Date().toLocaleString("en-IN"));
      // Refresh list to include the newly uploaded month
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

  if (!sheetData) {
    return <UploadScreen onDataLoaded={handleDataLoaded} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar
        months={availableMonths}
        activeMonth={activeMonthKey}
        onMonthChange={handleMonthChange}
        loadingMonth={loadingMonth}
        loadedAt={loadedAt}
      />

      {/* View toggle bar */}
      <div className="flex items-center gap-2 px-7 py-2.5 bg-[var(--bg2)] border-b border-border sticky top-[59px] z-40">
        <button
          onClick={() => handleTabSwitch("dashboard")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${view === "dashboard"
              ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]"
              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"
            }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => handleTabSwitch("data")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${view === "data"
              ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]"
              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"
            }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          Data Viewer
        </button>

        {loadingMonth && (
          <div className="ml-auto text-[10px] text-muted-foreground flex items-center gap-2 animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
            Synchronizing data...
          </div>
        )}
      </div>

      {/* Dashboard view */}
      {view === "dashboard" && (
        <div className={`p-6 lg:px-7 transition-opacity duration-300 ${loadingMonth ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <KpiCards data={sheetData} onDrillDown={handleDrillDown} />
          <ChartsDashboard data={sheetData} onDrillDown={handleDrillDown} />
        </div>
      )}

      {/* Data view */}
      {view === "data" && (
        <div className={`transition-opacity duration-300 ${loadingMonth ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <DataViewer
            data={sheetData}
            drillDown={drillDown}
            onBack={drillDown ? handleBack : undefined}
          />
        </div>
      )}
    </div>
  );
}
