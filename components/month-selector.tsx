"use client";

import { Loader2 } from "lucide-react";

export interface MonthInfo {
    key: string;
    monthKey: string;
    period: string;
    lastModified?: string;
    size?: number;
}

interface MonthSelectorProps {
    months: MonthInfo[];
    activeMonth: string;
    onMonthChange: (month: string) => void;
    loadingMonth?: string | null;
}

export function MonthSelector({
    months,
    activeMonth,
    onMonthChange,
    loadingMonth
}: MonthSelectorProps) {
    if (months.length === 0) return null;

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
            {months.map((m) => {
                const isActive = m.monthKey === activeMonth;
                const isLoading = loadingMonth === m.monthKey;

                return (
                    <button
                        key={m.monthKey}
                        disabled={isLoading}
                        onClick={() => onMonthChange(m.monthKey)}
                        className={`
              relative flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
              ${isActive
                                ? "bg-[var(--gold)] text-white shadow-[0_2px_10px_rgba(212,168,83,0.3)]"
                                : "bg-[var(--surface2)] text-muted-foreground hover:bg-[var(--gold-dim)] hover:text-[var(--gold)]"
                            }
              ${isLoading ? "opacity-70 cursor-wait" : "cursor-pointer"}
            `}
                    >
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {m.period}
                    </button>
                );
            })}
        </div>
    );
}
