"use client";

import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { MonthSelector, MonthInfo } from "./month-selector";

interface TopBarProps {
  months: MonthInfo[];
  activeMonth: string;
  onMonthChange: (month: string) => void;
  loadingMonth?: string | null;
  loadedAt: string;
}

export function TopBar({
  months,
  activeMonth,
  onMonthChange,
  loadingMonth,
  loadedAt
}: TopBarProps) {
  return (
    <header className="flex flex-col border-b border-border bg-[var(--surface)] sticky top-0 z-50">
      <div className="flex items-center gap-4 px-7 py-3">
        <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[12px] overflow-hidden bg-white border border-border shrink-0">
          <Image src="/iav_logo.jpeg" alt="Indian Art Villa" width={56} height={56} className="object-contain" />
        </div>
        <h1 className="text-sm font-bold text-foreground mr-4">
          Indian Art Villa
        </h1>

        <div className="flex-1 max-w-[60%] overflow-hidden">
          <MonthSelector
            months={months}
            activeMonth={activeMonth}
            onMonthChange={onMonthChange}
            loadingMonth={loadingMonth}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {loadedAt}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
