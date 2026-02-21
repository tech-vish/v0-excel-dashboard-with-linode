"use client";

import { useState, useCallback } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { UploadScreen } from "@/components/upload-screen";
import { TopBar } from "@/components/top-bar";
import { KpiCards } from "@/components/kpi-cards";
import { ChartsDashboard } from "@/components/charts-dashboard";
import { DataViewer } from "@/components/data-viewer";
import { detectPeriod } from "@/lib/data-helpers";
import type { SheetData } from "@/lib/data-helpers";

type ViewMode = "dashboard" | "data";

export default function Home() {
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [view, setView] = useState<ViewMode>("dashboard");
  const [period, setPeriod] = useState("Loading...");
  const [loadedAt, setLoadedAt] = useState("");

  const handleDataLoaded = useCallback((data: SheetData) => {
    setSheetData(data);
    setPeriod(detectPeriod(Object.keys(data)));
    setLoadedAt(
      "Loaded: " + new Date().toLocaleString("en-IN")
    );
  }, []);

  if (!sheetData) {
    return <UploadScreen onDataLoaded={handleDataLoaded} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar period={period} loadedAt={loadedAt} />

      {/* View toggle bar */}
      <div className="flex items-center gap-2 px-7 py-2.5 bg-[var(--bg2)] border-b border-border">
        <button
          onClick={() => setView("dashboard")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            view === "dashboard"
              ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]"
              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => setView("data")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            view === "data"
              ? "text-[var(--gold)] bg-[var(--gold-dim)] border-[rgba(212,168,83,0.2)]"
              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[var(--surface)]"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          Data Viewer
        </button>
      </div>

      {/* Dashboard view */}
      {view === "dashboard" && (
        <div className="p-6 lg:px-7">
          <KpiCards data={sheetData} />
          <ChartsDashboard data={sheetData} />
        </div>
      )}

      {/* Data view */}
      {view === "data" && <DataViewer data={sheetData} />}
    </div>
  );
}
