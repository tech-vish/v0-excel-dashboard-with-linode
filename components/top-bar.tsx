"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { MonthSelector, MonthInfo } from "./month-selector";

interface TopBarProps {
  months: MonthInfo[];
  activeMonth: string;
  onMonthChange: (month: string) => void;
  loadingMonth?: string | null;
  loadedAt: string;
  onLogout?: () => void;
}

export function TopBar({
  months,
  activeMonth,
  onMonthChange,
  loadingMonth,
  loadedAt,
  onLogout,
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

        <div className="flex-1">
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
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-[var(--surface)] transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
