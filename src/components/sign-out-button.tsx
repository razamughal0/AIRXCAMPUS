"use client";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

export function SignOutButton({
  compact = false,
  loginHref = "/",
}: {
  compact?: boolean;
  loginHref?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      try {
        sessionStorage.removeItem("aircampus_token");
      } catch {
        // Ignore storage error
      }
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      // Proceed to redirect even on network hiccup
    } finally {
      window.location.assign(loginHref);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        title="Sign out"
        aria-label="Sign out"
        className="h-9 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        <span className="hidden sm:inline">Sign out</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span>{loading ? "Signing out..." : "Sign out"}</span>
    </button>
  );
}
