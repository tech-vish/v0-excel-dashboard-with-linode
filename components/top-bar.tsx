"use client";

interface TopBarProps {
  period: string;
  loadedAt: string;
}

export function TopBar({ period, loadedAt }: TopBarProps) {
  return (
    <header className="flex items-center gap-4 px-7 py-3.5 bg-[var(--surface)] border-b border-border sticky top-0 z-50">
      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[var(--gold)] to-[#e8c960] font-extrabold text-[15px] text-[#0b0d11] tracking-tight">
        IV
      </div>
      <h1 className="text-base font-semibold text-foreground">
        Indian Art Villa
      </h1>
      <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-[var(--gold-dim)] text-[var(--gold)] border border-[rgba(212,168,83,0.2)]">
        {period}
      </span>
      <span className="ml-auto text-[11px] text-muted-foreground">
        {loadedAt}
      </span>
    </header>
  );
}
