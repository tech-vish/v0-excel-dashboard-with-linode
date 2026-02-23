"use client";

import {
  TrendingUp,
  Package,
  ShoppingCart,
  RotateCcw,
  Warehouse,
  DollarSign,
} from "lucide-react";
import type { SheetData } from "@/lib/data-helpers";
import { findRowValue, fmtINR, fmtPct } from "@/lib/data-helpers";
import type { DrillDown } from "@/app/page";

interface KpiCardsProps {
  data: SheetData;
  onDrillDown: (d: DrillDown) => void;
}

const KPI_ICONS = [DollarSign, Package, TrendingUp, ShoppingCart, RotateCcw, Warehouse];

const COLOR_MAP: Record<
  string,
  { border: string; text: string; bg: string }
> = {
  gold: {
    border: "var(--gold)",
    text: "var(--gold)",
    bg: "var(--gold-dim)",
  },
  blue: {
    border: "var(--blue)",
    text: "var(--blue)",
    bg: "var(--blue-dim)",
  },
  green: {
    border: "var(--green)",
    text: "var(--green)",
    bg: "var(--green-dim)",
  },
  red: {
    border: "var(--red)",
    text: "var(--red)",
    bg: "var(--red-dim)",
  },
  purple: {
    border: "var(--chart-4)",
    text: "var(--chart-4)",
    bg: "rgba(var(--chart-4-rgb), 0.1)",
  },
  cyan: {
    border: "var(--chart-5)",
    text: "var(--chart-5)",
    bg: "rgba(var(--chart-5-rgb), 0.1)",
  },
};

export function KpiCards({ data, onDrillDown }: KpiCardsProps) {
  const pl = data["IAV P&L NOV 2025"] || [];
  const orders = data["ORDERS SHEET"] || [];
  const stock = data["STOCK VALUE"] || [];

  const netSale = findRowValue(pl, "Net Sale", 1);
  const cogs = findRowValue(pl, "Total COGS", 1);
  const grossMargin =
    netSale && cogs ? (netSale - cogs) / netSale : null;
  const totalOrders = findRowValue(orders, "TOTAL ORDERS", 1);
  const returnOrders = findRowValue(orders, "RETURN ORDERS", 1);
  const returnRate =
    totalOrders && returnOrders ? returnOrders / totalOrders : null;
  const closingStock = findRowValue(
    stock,
    "TOTAL STOCK VALUE AT COST",
    2
  );

  const kpis = [
    {
      label: "Net Sales",
      value: fmtINR(netSale),
      color: "gold",
      sub: "Total across all channels",
      drill: { sheet: "IAV P&L NOV 2025", searchTerm: "Net Sale", colIndex: 1 } as DrillDown,
    },
    {
      label: "Cost of Goods Sold",
      value: fmtINR(cogs),
      color: "blue",
      sub: "COGS for the period",
      drill: { sheet: "IAV P&L NOV 2025", searchTerm: "Total COGS", colIndex: 1 } as DrillDown,
    },
    {
      label: "Gross Margin",
      value: grossMargin !== null ? fmtPct(grossMargin) : "—",
      color: "green",
      sub:
        netSale && cogs ? fmtINR(netSale - cogs) + " contribution" : "",
      drill: { sheet: "IAV P&L NOV 2025", searchTerm: "Net Sale", colIndex: 1 } as DrillDown,
    },
    {
      label: "Total Orders",
      value:
        totalOrders !== null
          ? totalOrders.toLocaleString("en-IN")
          : "—",
      color: "purple",
      sub: "All channels combined",
      drill: { sheet: "ORDERS SHEET", searchTerm: "TOTAL ORDERS", colIndex: 1 } as DrillDown,
    },
    {
      label: "Return Rate",
      value: returnRate !== null ? fmtPct(returnRate) : "—",
      color: "red",
      sub: returnOrders
        ? returnOrders.toLocaleString("en-IN") + " returned"
        : "",
      drill: { sheet: "ORDERS SHEET", searchTerm: "RETURN ORDERS", colIndex: 1 } as DrillDown,
    },
    {
      label: "Closing Stock (at Cost)",
      value: fmtINR(closingStock),
      color: "cyan",
      sub: "Inventory valuation",
      drill: { sheet: "STOCK VALUE", searchTerm: "TOTAL STOCK VALUE AT COST", colIndex: 2 } as DrillDown,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-7">
      {kpis.map((kpi, i) => {
        const colors = COLOR_MAP[kpi.color] || COLOR_MAP.gold;
        const Icon = KPI_ICONS[i];
        return (
          <div
            key={kpi.label}
            onClick={() => onDrillDown(kpi.drill)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onDrillDown(kpi.drill)}
            title={`View source: ${kpi.drill.sheet} › ${kpi.drill.searchTerm}`}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5 cursor-pointer
              transition-all duration-200 hover:ring-2 hover:ring-[var(--gold)] hover:ring-opacity-60
              hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            style={{
              animationDelay: `${i * 80}ms`,
              animation: "fadeUp .5s ease both",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, ${colors.border}, ${colors.border}80)`,
              }}
            />
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: colors.bg }}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: colors.text }}
                />
              </div>
              <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
            </div>
            <div
              className="text-2xl font-bold tracking-tight"
              style={{ color: colors.text }}
            >
              {kpi.value}
            </div>
            {kpi.sub && (
              <div className="text-xs text-muted-foreground mt-1.5">
                {kpi.sub}
              </div>
            )}
            {/* Drill-down hint */}
            <div className="absolute bottom-2 right-3 text-[9px] text-muted-foreground/50 font-medium tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              ↗ View data
            </div>
          </div>
        );
      })}
    </div>
  );
}
