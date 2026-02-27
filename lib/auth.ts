// ── Credentials ───────────────────────────────────────────────────────────
// Change USERNAME and PASSWORD here to update login credentials.
export const AUTH_USERNAME = "admin";
export const AUTH_PASSWORD = "iav@2025";

// ── Storage ───────────────────────────────────────────────────────────────
const SESSION_KEY = "iav_session";
const SESSION_VALUE = "authenticated";
const LAST_MONTH_KEY = "iav_last_month";

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_KEY) === SESSION_VALUE;
}

export function login(username: string, password: string): boolean {
  if (username.trim().toLowerCase() === AUTH_USERNAME && password === AUTH_PASSWORD) {
    localStorage.setItem(SESSION_KEY, SESSION_VALUE);
    return true;
  }
  return false;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_MONTH_KEY);
}

export function saveLastMonth(monthKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_MONTH_KEY, monthKey);
}

export function getLastMonth(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_MONTH_KEY) ?? "";
}
