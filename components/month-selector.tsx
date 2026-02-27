"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Calendar } from "lucide-react";

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
    loadingMonth,
}: MonthSelectorProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const active = months.find(m => m.monthKey === activeMonth);
    const isLoading = !!loadingMonth;

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
        return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
    }, [open]);

    if (months.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(v => !v)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    open
                        ? "bg-[var(--gold)] text-white border-[var(--gold)] shadow-[0_2px_10px_rgba(212,168,83,0.3)]"
                        : "bg-[var(--surface2)] text-foreground border-border hover:border-[var(--gold)] hover:text-[var(--gold)]"
                } ${isLoading ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
            >
                {isLoading
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Calendar className="h-3 w-3" />
                }
                <span>{active?.period ?? "Select Month"}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 mt-2 min-w-[160px] rounded-xl border border-border bg-[var(--surface)] shadow-xl z-[60] py-1.5 overflow-hidden">
                    <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Available Months
                    </p>
                    {months.map(m => {
                        const isCurrent = m.monthKey === activeMonth;
                        const isThisLoading = loadingMonth === m.monthKey;
                        return (
                            <button
                                key={m.monthKey}
                                disabled={isThisLoading}
                                onClick={() => { onMonthChange(m.monthKey); setOpen(false); }}
                                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs transition-colors ${
                                    isCurrent
                                        ? "text-[var(--gold)] font-semibold bg-[var(--gold-dim)]"
                                        : "text-foreground hover:bg-[var(--bg2)]"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0" />}
                                    {m.period}
                                </span>
                                {isThisLoading && <Loader2 className="h-3 w-3 animate-spin text-[var(--gold)]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
