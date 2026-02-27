"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { login } from "@/lib/auth";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      triggerShake();
      return;
    }
    setLoading(true);
    setError("");
    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 400));
    const ok = login(username, password);
    setLoading(false);
    if (ok) {
      onLogin();
    } else {
      setError("Incorrect username or password.");
      setPassword("");
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto py-10">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Card */}
      <div
        className={`w-[420px] max-w-[90vw] flex flex-col items-center gap-7 ${shake ? "animate-shake" : ""}`}
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl overflow-hidden bg-white border border-border shadow-md">
            <Image
              src="/iav_logo.jpeg"
              alt="Indian Art Villa"
              width={96}
              height={96}
              className="object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Indian Art Villa</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Financial Dashboard</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-r from-[#1a1209] to-[#3d2e0e] px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(212,168,83,0.15)] border border-[rgba(212,168,83,0.2)] flex items-center justify-center">
              <LogIn className="h-4 w-4 text-[var(--gold)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sign In</p>
              <p className="text-[10px] text-[rgba(212,168,83,0.7)]">Enter your credentials to continue</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter username"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--gold)] transition"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Enter password"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--gold)] transition"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1
                bg-gradient-to-br from-[#1a1209] via-[#3d2e0e] to-[#6b4e15]
                text-[var(--gold)] border border-[rgba(212,168,83,0.3)]
                hover:border-[var(--gold)] hover:shadow-[0_0_16px_rgba(212,168,83,0.2)]
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                : <><LogIn className="h-4 w-4" /> Sign In</>
              }
            </button>
          </form>
        </div>

        <p className="text-[10px] text-muted-foreground/50 text-center">
          Indian Art Villa &middot; Powered by Ideate Consultancy
        </p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}
