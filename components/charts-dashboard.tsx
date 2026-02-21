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

interface ChartsDashboardProps {
  data: SheetData;
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
      </div>
    );
  }
  return null;
};

export function ChartsDashboard({ data }: ChartsDashboardProps) {
  const pct = data["% Sheet"] || [];
  const salesRow = findRow(pct, "Sales (Rs.)");
  const marginRow = findRow(pct, "Margin %");
  const shareRow = findRow(pct, "Share In Net Sale");

  const salesData = CHANNELS.map((ch, i) => ({
    name: ch,
    value: salesRow
      ? typeof salesRow[i + 1] === "number"
        ? (salesRow[i + 1] as number)
        : 0
      : 0,
    fill: CHANNEL_COLORS[i],
  }));

  const marginData = CHANNELS.map((ch, i) => ({
    name: ch,
    value: marginRow
      ? typeof marginRow[i + 1] === "number"
        ? (marginRow[i + 1] as number) * 100
        : 0
      : 0,
    fill:
      marginRow && typeof marginRow[i + 1] === "number"
        ? (marginRow[i + 1] as number) < 0
          ? "#ef6060"
          : "#3dd68c"
        : "#3dd68c",
  }));

  const shareData = CHANNELS.map((ch, i) => ({
    name: ch,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
      {hasSalesData && (
        <ChartCard title="Channel-wise Net Sales">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={salesData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2130"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#9a9eb5" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: "#9a9eb5" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <CustomTooltip formatter={(v) => fmtINR(v)} />
                }
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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
            <PieChart>
              <Pie
                data={shareData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                paddingAngle={2}
                stroke="#161921"
                strokeWidth={2}
              >
                {shareData
                  .filter((d) => d.value > 0)
                  .map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value.toFixed(1) + "%", "Share"]}
                contentStyle={{
                  background: "#1c1f2a",
                  border: "1px solid #272b3a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                itemStyle={{
                  color: "#e4e6f0",
                }}
                labelStyle={{
                  color: "#9a9eb5",
                  marginBottom: "4px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "#9a9eb5" }}
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasMarginData && (
        <ChartCard title="Channel-wise Margin %">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={marginData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2130"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#9a9eb5" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => v + "%"}
                tick={{ fontSize: 10, fill: "#9a9eb5" }}
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
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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
            <BarChart data={top10States} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2130"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: "#9a9eb5" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "#9a9eb5" }}
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
                fill="#5b9cf5"
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
