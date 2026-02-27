"use client";

import { useState, useEffect, useRef } from "react";
import {
  StickyNote,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Clock,
} from "lucide-react";
import type { MonthInfo } from "@/components/month-selector";
import { keyToPeriod } from "@/lib/data-helpers";

interface Props {
  availableMonths: MonthInfo[];
  activeMonthKey: string;
  open: boolean;
  onClose: () => void;
}

type SendState = "idle" | "sending" | "sent" | "error";

const STORAGE_KEY = "iav_notes";

function loadAllNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveAllNotes(notes: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function NotesPanel({ availableMonths, activeMonthKey, open, onClose }: Props) {
  const [allNotes, setAllNotes] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(activeMonthKey);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendHistory, setSendHistory] = useState<Record<string, string>>({}); // key → last sent time
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on open
  useEffect(() => {
    if (open) {
      setAllNotes(loadAllNotes());
      // default to active month
      setSelectedMonth(activeMonthKey || availableMonths[0]?.monthKey || "");
      setSendState("idle");
      setErrorMsg("");
    }
  }, [open, activeMonthKey, availableMonths]);

  // Auto-focus textarea when month changes
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [selectedMonth, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // slight delay so the opening click doesn't immediately close
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [open, onClose]);

  const currentNote = allNotes[selectedMonth] ?? "";

  const updateNote = (val: string) => {
    const updated = { ...allNotes, [selectedMonth]: val };
    setAllNotes(updated);
    saveAllNotes(updated);
    if (sendState === "sent") setSendState("idle");
  };

  const clearNote = () => {
    const updated = { ...allNotes };
    delete updated[selectedMonth];
    setAllNotes(updated);
    saveAllNotes(updated);
  };

  const sendEmail = async () => {
    if (!currentNote.trim()) return;
    setSendState("sending");
    setErrorMsg("");
    try {
      const period = keyToPeriod(selectedMonth) || selectedMonth;
      const res = await fetch("/api/notes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: period, notes: currentNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSendState("sent");
      const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      setSendHistory(prev => ({ ...prev, [selectedMonth]: time }));
    } catch (err: unknown) {
      setSendState("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const period = keyToPeriod(selectedMonth) || selectedMonth;
  const noteCount = currentNote.trim().split("\n").filter(l => l.trim()).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col bg-[var(--surface)] border-l border-border shadow-2xl"
        style={{ animation: "slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-[#1a1209] to-[#3d2e0e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(212,168,83,0.15)] border border-[rgba(212,168,83,0.25)] flex items-center justify-center">
              <StickyNote className="h-4 w-4 text-[var(--gold)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Monthly Notes</h2>
              <p className="text-[10px] text-[rgba(212,168,83,0.7)] mt-0.5">Add observations for each month</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>

        {/* ── Month Selector ── */}
        <div className="px-5 py-3 border-b border-border bg-[var(--bg2)]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Viewing notes for</p>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-[var(--surface)] hover:border-[var(--gold)] transition-colors text-sm font-semibold text-foreground"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                {period}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-[var(--surface)] shadow-xl z-10 py-1 max-h-48 overflow-y-auto">
                {availableMonths.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No months available</p>
                )}
                {availableMonths.map(m => {
                  const hasNote = !!(allNotes[m.monthKey]?.trim());
                  return (
                    <button
                      key={m.monthKey}
                      onClick={() => { setSelectedMonth(m.monthKey); setDropdownOpen(false); setSendState("idle"); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--bg2)] transition-colors ${selectedMonth === m.monthKey ? "text-[var(--gold)] font-semibold" : "text-foreground"}`}
                    >
                      <span className="flex items-center gap-2">
                        {selectedMonth === m.monthKey && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />}
                        {m.period}
                      </span>
                      {hasNote && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold-dim)] text-[var(--gold)] font-medium border border-[rgba(212,168,83,0.2)]">
                          has notes
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Month note count badge */}
          {currentNote.trim() && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{noteCount} line{noteCount !== 1 ? "s" : ""} recorded</span>
              {sendHistory[selectedMonth] && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                  <Clock className="h-2.5 w-2.5" />
                  Last sent {sendHistory[selectedMonth]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Notes Textarea ── */}
        <div className="flex-1 flex flex-col px-5 py-4 gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              Notes for {period}
            </label>
            {currentNote.trim() && (
              <button
                onClick={clearNote}
                className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={currentNote}
            onChange={e => updateNote(e.target.value)}
            placeholder={`Write your observations for ${period}...\n\nTip: Each line becomes a bullet point in the email.`}
            className="flex-1 resize-none rounded-xl border border-border bg-[var(--bg2)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[rgba(212,168,83,0.3)] transition-all leading-relaxed"
          />

          {/* Quick templates */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Quick templates</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Revenue up vs last month",
                "Strong Myntra performance",
                "IAV.IN growth noted",
                "Margins improved",
                "Export orders spike",
                "Flipkart returns high",
              ].map(t => (
                <button
                  key={t}
                  onClick={() => updateNote(currentNote ? `${currentNote}\n${t}` : t)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-[var(--surface)] text-muted-foreground hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer / Send Bar ── */}
        <div className="px-5 py-4 border-t border-border bg-[var(--bg2)] space-y-2.5">

          {/* Status messages */}
          {sendState === "sent" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              Notes sent successfully to vishnu@shivik.in
            </div>
          )}
          {sendState === "error" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {errorMsg || "Failed to send. Please try again."}
            </div>
          )}

          {/* Email info */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Will be sent to: <strong className="text-foreground">vishnu@shivik.in</strong></span>
            <span className="text-[var(--gold)]">via Resend</span>
          </div>

          {/* Send button */}
          <button
            disabled={!currentNote.trim() || sendState === "sending"}
            onClick={sendEmail}
            className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed
              bg-gradient-to-br from-[#1a1209] via-[#3d2e0e] to-[#6b4e15]
              text-[var(--gold)] border border-[rgba(212,168,83,0.3)]
              hover:border-[var(--gold)] hover:shadow-[0_0_16px_rgba(212,168,83,0.2)]"
          >
            {sendState === "sending" ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
            ) : (
              <><Send className="h-4 w-4" />Send Notes for {period}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
