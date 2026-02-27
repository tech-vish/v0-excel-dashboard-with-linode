"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";

export function IdeateBadge() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {collapsed ? (
        /* ── Minimized: just the logo circle ── */
        <button
          onClick={() => setCollapsed(false)}
          title="Presented by Ideate Consultancy"
          className="w-11 h-11 rounded-full border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface,#1a1d24)] shadow-lg backdrop-blur-sm overflow-hidden hover:ring-2 hover:ring-[var(--gold,#d4a853)] hover:ring-offset-1 hover:ring-offset-transparent transition-all"
        >
          <Image
            src="/ideate.jpeg"
            alt="Ideate Consultancy"
            width={44}
            height={44}
            className="rounded-full object-cover w-full h-full"
          />
        </button>
      ) : (
        /* ── Expanded badge ── */
        <div className="flex items-center gap-3 bg-[var(--surface,#1a1d24)] border border-[var(--border,rgba(255,255,255,0.08))] rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity">
          <Image
            src="/ideate.jpeg"
            alt="Ideate Consultancy"
            width={40}
            height={40}
            className="rounded-lg object-contain flex-shrink-0"
          />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Presented by Ideate Consultancy
          </span>
          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(true)}
            title="Minimize"
            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.08)] transition-colors flex-shrink-0"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
