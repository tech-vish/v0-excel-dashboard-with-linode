"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { SheetData } from "@/lib/data-helpers";
import {
  findRow,
  findRowValue,
  fmtINR,
  fmtPct,
  getPLSheet,
  keyToPeriod,
} from "@/lib/data-helpers";
import { CHANNELS, CHANNEL_COLORS } from "@/lib/sheet-config";

interface ComparisonDashboardProps {
  compareData: Record<string, SheetData>; // monthKey -> SheetData
  months: string[]; // ordered monthKeys
}

// Palette for months (cycles if >6)
const MONTH_COLORS = [
  "#5b9cf5",
  "#d4a853",
  "#3dd68c",
  "#fb923c",
  "#a78bfa",
  "#ef6060",
  "#22d3ee",
];

function monthLabel(key: string) {
  return keyToPeriod(key);
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5" style={{ animation: "fadeUp .6s ease both" }}>
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

const MonthTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-[var(--surface2)] px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ComparisonDashboard({ compareData, months }: ComparisonDashboardProps) {
  if (months.length < 2) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        Select at least 2 months to compare.
      </div>
    );
  }

  // ── KPI metrics across months ──────────────────────────────────────────────
  const KPI_DEFS = [
    { label: "Net Sales", extractor: (d: SheetData) => findRowValue(getPLSheet(d), "Net Sale", 1), fmt: fmtINR },
    { label: "Total COGS", extractor: (d: SheetData) => findRowValue(getPLSheet(d), "Total COGS", 1), fmt: fmtINR },
    {
      label: "Gross Margin %",
      extractor: (d: SheetData) => {
        const ns = findRowValue(getPLSheet(d), "Net Sale", 1);
        const cogs = findRowValue(getPLSheet(d), "Total COGS", 1);
        return ns && cogs ? (ns - cogs) / ns : null;
      },
      fmt: (v: number | null) => v !== null ? fmtPct(v) : "—",
    },
    { label: "Total Orders", extractor: (d: SheetData) => findRowValue(d["ORDERS SHEET"] || [], "TOTAL ORDERS", 1), fmt: (v: number | null) => v !== null ? v.toLocaleString("en-IN") : "—" },
    {
      label: "Return Rate",
      extractor: (d: SheetData) => {
        const tot = findRowValue(d["ORDERS SHEET"] || [], "TOTAL ORDERS", 1);
        const ret = findRowValue(d["ORDERS SHEET"] || [], "RETURN ORDERS", 1);
        return tot && ret ? ret / tot : null;
      },
      fmt: (v: number | null) => v !== null ? fmtPct(v) : "—",
    },
    { label: "Closing Stock", extractor: (d: SheetData) => findRowValue(d["STOCK VALUE"] || [], "TOTAL STOCK VALUE AT COST", 2), fmt: fmtINR },
  ];

  // ── Channel Net Sales: grouped bar per channel, one bar per month ──────────
  const salesRowsByMonth = months.map((mk) => {
    const pct = compareData[mk]?.["% Sheet"] || [];
    return findRow(pct, "Sales (Rs.)");
  });

  const channelSalesData = CHANNELS.map((ch, ci) => {
    const entry: Record<string, string | number> = { channel: ch };
    months.forEach((mk, mi) => {
      const row = salesRowsByMonth[mi];
      entry[monthLabel(mk)] = row && typeof row[ci + 1] === "number" ? (row[ci + 1] as number) : 0;
    });
    return entry;
  });

  // ── Channel Margin %: grouped bar per channel ──────────────────────────────
  const marginRowsByMonth = months.map((mk) => {
    const pct = compareData[mk]?.["% Sheet"] || [];
    return findRow(pct, "Margin %");
  });

  const channelMarginData = CHANNELS.map((ch, ci) => {
    const entry: Record<string, string | number> = { channel: ch };
    months.forEach((mk, mi) => {
      const row = marginRowsByMonth[mi];
      entry[monthLabel(mk)] = row && typeof row[ci + 1] === "number" ? Math.round((row[ci + 1] as number) * 1000) / 10 : 0;
    });
    return entry;
  });

  // ── Month-over-month Net Sales trend ──────────────────────────────────────
  const salesTrendData = months.map((mk) => ({
    month: monthLabel(mk),
    "Net Sales": findRowValue(getPLSheet(compareData[mk] || {}), "Net Sale", 1) ?? 0,
    "Total COGS": findRowValue(getPLSheet(compareData[mk] || {}), "Total COGS", 1) ?? 0,
  }));

  const hasChannelSales = channelSalesData.some((d) =>
    months.some((mk) => (d[monthLabel(mk)] as number) !== 0)
  );
  const hasChannelMargin = channelMarginData.some((d) =>
    months.some((mk) => (d[monthLabel(mk)] as number) !== 0)
  );

  return (
    <div className="space-y-6">
      {/* ── KPI Comparison Table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ animation: "fadeUp .5s ease both" }}>
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">KPI Month-over-Month</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground w-[180px]">Metric</th>
                {months.map((mk, mi) => (
                  <th key={mk} className="text-right px-4 py-3 font-semibold whitespace-nowrap" style={{ color: MONTH_COLORS[mi % MONTH_COLORS.length] }}>
                    {monthLabel(mk)}
                  </th>
                ))}
                {months.length === 2 && <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Change</th>}
              </tr>
            </thead>
            <tbody>
              {KPI_DEFS.map((kpi, ki) => {
                const values = months.map((mk) => kpi.extractor(compareData[mk] || {}));
                const fmtFn = kpi.fmt as (v: number | null) => string;

                // Change column (only when exactly 2 months)
                let changeEl: React.ReactNode = null;
                if (months.length === 2) {
                  const v0 = values[0];
                  const v1 = values[1];
                  if (typeof v0 === "number" && typeof v1 === "number" && v1 !== 0) {
                    const pct = ((v0 - v1) / Math.abs(v1)) * 100;
                    const up = pct >= 0;
                    changeEl = (
                      <span className={`font-semibold ${up ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
                      </span>
                    );
                  } else {
                    changeEl = <span className="text-muted-foreground">—</span>;
                  }
                }

                return (
                  <tr key={ki} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${ki % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-5 py-2.5 font-medium text-foreground">{kpi.label}</td>
                    {values.map((v, vi) => (
                      <td key={vi} className="px-4 py-2.5 text-right font-mono" style={{ color: MONTH_COLORS[vi % MONTH_COLORS.length] }}>
                        {fmtFn(v)}
                      </td>
                    ))}
                    {months.length === 2 && <td className="px-4 py-2.5 text-right">{changeEl}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Trend Chart ──────────────────────────────────────────────────── */}
      <ChartCard title="Net Sales & COGS Trend">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={salesTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<MonthTooltip formatter={(v) => fmtINR(v)} />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "var(--text2)" }} iconSize={10} />
            <Line type="monotone" dataKey="Net Sales" stroke="#5b9cf5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Total COGS" stroke="#d4a853" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Channel Net Sales Grouped Bar ─────────────────────────────── */}
        {hasChannelSales && (
          <ChartCard title="Channel-wise Net Sales Comparison">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelSalesData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="channel" tick={{ fontSize: 9, fill: "var(--text2)" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 9, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<MonthTooltip formatter={(v) => fmtINR(v)} />} />
                <Legend wrapperStyle={{ fontSize: "10px", color: "var(--text2)" }} iconSize={8} />
                {months.map((mk, mi) => (
                  <Bar key={mk} dataKey={monthLabel(mk)} fill={MONTH_COLORS[mi % MONTH_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Channel Margin % Grouped Bar ──────────────────────────────── */}
        {hasChannelMargin && (
          <ChartCard title="Channel-wise Margin % Comparison">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelMarginData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="channel" tick={{ fontSize: 9, fill: "var(--text2)" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tickFormatter={(v) => v + "%"} tick={{ fontSize: 9, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<MonthTooltip formatter={(v) => v.toFixed(1) + "%"} />} />
                <Legend wrapperStyle={{ fontSize: "10px", color: "var(--text2)" }} iconSize={8} />
                {months.map((mk, mi) => (
                  <Bar key={mk} dataKey={monthLabel(mk)} fill={MONTH_COLORS[mi % MONTH_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
