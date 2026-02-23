"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { SheetData } from "@/lib/data-helpers";
import { findRow, fmtINR } from "@/lib/data-helpers";
import { CHANNELS, CHANNEL_COLORS } from "@/lib/sheet-config";
import type { DrillDown } from "@/app/page";

interface ChartsDashboardProps {
  data: SheetData;
  onDrillDown: (d: DrillDown) => void;
}

function ChartCard({
  title,
  children,
  fullWidth = false,
}: {
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 ${fullWidth ? "col-span-full" : ""}`}
      style={{ animation: "fadeUp .6s ease both" }}
    >
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatter?: (val: number) => string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-[var(--surface2)] px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {formatter ? formatter(payload[0].value) : payload[0].value}
        </p>
        <p className="text-[10px] text-[var(--gold)] mt-1">Click to view source ↗</p>
      </div>
    );
  }
  return null;
};

const PieCustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg border border-border px-3 py-2 shadow-lg text-xs"
        style={{
          background: "var(--surface2)",
          color: "var(--foreground)",
        }}
      >
        <p className="text-muted-foreground mb-1">{payload[0].name}</p>
        <p className="font-semibold">{payload[0].value.toFixed(1)}%</p>
        <p className="text-[10px] text-[var(--gold)] mt-1">Click to view source ↗</p>
      </div>
    );
  }
  return null;
};

// Shortened display labels for long channel names used in charts
const CHART_LABEL: Record<string, string> = {
  "INDIAN ART VILLA.IN": "IAV.IN",
  "INDIAN ART VILLA.COM": "IAV.COM",
};

export function ChartsDashboard({ data, onDrillDown }: ChartsDashboardProps) {
  const pct = data["% Sheet"] || [];
  const salesRow = findRow(pct, "Sales (Rs.)");
  const marginRow = findRow(pct, "Margin %");
  const shareRow = findRow(pct, "Share In Net Sale");

  const salesData = CHANNELS.map((ch, i) => ({
    name: CHART_LABEL[ch] ?? ch,
    value: salesRow
      ? typeof salesRow[i + 1] === "number"
        ? (salesRow[i + 1] as number)
        : 0
      : 0,
    fill: CHANNEL_COLORS[i],
  }));

  const marginData = CHANNELS.map((ch, i) => ({
    name: CHART_LABEL[ch] ?? ch,
    value: marginRow
      ? typeof marginRow[i + 1] === "number"
        ? (marginRow[i + 1] as number) * 100
        : 0
      : 0,
    fill:
      marginRow && typeof marginRow[i + 1] === "number"
        ? (marginRow[i + 1] as number) < 0
          ? "var(--red)"
          : "var(--green)"
        : "var(--green)",
  }));

  const shareData = CHANNELS.map((ch, i) => ({
    name: CHART_LABEL[ch] ?? ch,
    value: shareRow
      ? typeof shareRow[i + 1] === "number"
        ? Math.abs((shareRow[i + 1] as number) * 100)
        : 0
      : 0,
    fill: CHANNEL_COLORS[i],
  }));

  // Top States by Net Sales
  const stateSheet =
    data["STATEWISE SALE "] || data["STATEWISE SALE"] || [];
  const statesRaw: { name: string; value: number }[] = [];
  for (let i = 2; i < stateSheet.length; i++) {
    const name = String(stateSheet[i][0] || "").trim();
    const val = stateSheet[i][1];
    if (
      name &&
      name !== "TOTAL" &&
      typeof val === "number" &&
      val > 0
    ) {
      statesRaw.push({ name, value: val });
    }
  }
  statesRaw.sort((a, b) => b.value - a.value);
  const top10States = statesRaw.slice(0, 10);

  const hasSalesData = salesData.some((d) => d.value !== 0);
  const hasShareData = shareData.some((d) => d.value !== 0);
  const hasMarginData = marginData.some((d) => d.value !== 0);
  const hasStatesData = top10States.length > 0;

  // Determine statewise sheet name (note trailing space variant)
  const statewiseSheetName =
    data["STATEWISE SALE "] !== undefined ? "STATEWISE SALE " : "STATEWISE SALE";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
      {hasSalesData && (
        <ChartCard title="Channel-wise Net Sales">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={salesData}
              style={{ cursor: "pointer" }}
              onClick={() =>
                onDrillDown({ sheet: "% Sheet", searchTerm: "Sales (Rs.)" })
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--text2)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: "var(--text2)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <CustomTooltip formatter={(v) => fmtINR(v)} />
                }
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                onClick={() =>
                  onDrillDown({ sheet: "% Sheet", searchTerm: "Sales (Rs.)" })
                }
              >
                {salesData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasShareData && (
        <ChartCard title="Sales Mix by Channel">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart style={{ cursor: "pointer" }}>
              <Pie
                data={shareData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={2}
                onClick={() =>
                  onDrillDown({
                    sheet: "% Sheet",
                    searchTerm: "Share In Net Sale",
                  })
                }
              >
                {shareData
                  .filter((d) => d.value > 0)
                  .map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "var(--text2)" }}
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasMarginData && (
        <ChartCard title="Channel-wise Margin %">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={marginData}
              style={{ cursor: "pointer" }}
              onClick={() =>
                onDrillDown({ sheet: "% Sheet", searchTerm: "Margin %" })
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--text2)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tickFormatter={(v) => v + "%"}
                tick={{ fontSize: 10, fill: "var(--text2)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={(v) => v.toFixed(1) + "%"}
                  />
                }
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                onClick={() =>
                  onDrillDown({ sheet: "% Sheet", searchTerm: "Margin %" })
                }
              >
                {marginData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasStatesData && (
        <ChartCard title="Top States by Net Sales (Amazon)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={top10States}
              layout="vertical"
              style={{ cursor: "pointer" }}
              onClick={(chartData) => {
                const stateName =
                  chartData?.activePayload?.[0]?.payload?.name as
                  | string
                  | undefined;
                onDrillDown({
                  sheet: statewiseSheetName,
                  searchTerm: stateName ?? "",
                });
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: "var(--text2)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--text2)" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                content={
                  <CustomTooltip formatter={(v) => fmtINR(v)} />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--chart-1)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {!hasSalesData &&
        !hasShareData &&
        !hasMarginData &&
        !hasStatesData && (
          <div className="col-span-full flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No chart data available for the loaded sheets.
          </div>
        )}
    </div>
  );
}
