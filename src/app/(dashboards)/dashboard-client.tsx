"use client";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { notifications, users } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth";

interface DashboardClientProps {
  notifications: (typeof notifications.$inferSelect)[];
  user: typeof users.$inferSelect | undefined;
  session: SessionPayload;
  children: ReactNode;
}

export function DashboardClient({ children }: DashboardClientProps) {
  useEffect(() => {
    // Support strict third-party cookie-blocking iframe environments transparently
    let fallbackToken: string | null = null;
    try {
      const url = new URL(window.location.href);
      const urlToken = url.searchParams.get("_st");
      if (urlToken) {
        sessionStorage.setItem("aircampus_token", urlToken);
        fallbackToken = urlToken;
      } else {
        fallbackToken = sessionStorage.getItem("aircampus_token");
      }
    } catch {
      fallbackToken = null;
    }

    if (!fallbackToken) return;

    const token = fallbackToken;

    // Patch window.fetch for same-origin /api/* calls to include Authorization header if cookies are blocked
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const urlStr =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;

        if (urlStr.startsWith("/api/") || urlStr.startsWith(`${window.location.origin}/api/`)) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      } catch {
        // Fallback to originalFetch
      }
      return originalFetch(input, init);
    };

    // Intercept internal anchor clicks when in cookie-blocked fallback mode so `_st` propagates smoothly
    function handleDocumentClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;

      const dest = new URL(href, window.location.origin);
      if (
        dest.pathname.startsWith("/student") ||
        dest.pathname.startsWith("/faculty") ||
        dest.pathname.startsWith("/admin") ||
        dest.pathname.startsWith("/super-admin")
      ) {
        if (!dest.searchParams.has("_st")) {
          e.preventDefault();
          dest.searchParams.set("_st", token);
          window.location.assign(dest.pathname + dest.search + dest.hash);
        }
      }
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  return <>{children}</>;
}
