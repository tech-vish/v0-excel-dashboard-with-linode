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

interface KpiCardsProps {
  data: SheetData;
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

export function KpiCards({ data }: KpiCardsProps) {
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
    },
    {
      label: "Cost of Goods Sold",
      value: fmtINR(cogs),
      color: "blue",
      sub: "COGS for the period",
    },
    {
      label: "Gross Margin",
      value: grossMargin !== null ? fmtPct(grossMargin) : "\u2014",
      color: "green",
      sub:
        netSale && cogs ? fmtINR(netSale - cogs) + " contribution" : "",
    },
    {
      label: "Total Orders",
      value:
        totalOrders !== null
          ? totalOrders.toLocaleString("en-IN")
          : "\u2014",
      color: "purple",
      sub: "All channels combined",
    },
    {
      label: "Return Rate",
      value: returnRate !== null ? fmtPct(returnRate) : "\u2014",
      color: "red",
      sub: returnOrders
        ? returnOrders.toLocaleString("en-IN") + " returned"
        : "",
    },
    {
      label: "Closing Stock (at Cost)",
      value: fmtINR(closingStock),
      color: "cyan",
      sub: "Inventory valuation",
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
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
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
          </div>
        );
      })}
    </div>
  );
}
