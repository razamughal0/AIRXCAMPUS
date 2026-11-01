"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ChevronLeft, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button, Input, Card, Modal } from "@/components/ui";

interface LoginClientProps {
  role: "student" | "faculty" | "admin" | "super_admin";
  title: string;
  subtitle: string;
  accent: string;
  demoAccounts: { email: string; password: string; label: string }[];
}

const PORTAL_LINKS: { role: LoginClientProps["role"]; label: string; href: string }[] = [
  { role: "student", label: "Student", href: "/login/student" },
  { role: "faculty", label: "Faculty", href: "/login/faculty" },
  { role: "admin", label: "Admin", href: "/login/admin" },
  { role: "super_admin", label: "Super Admin", href: "/login/super-admin" },
];

export function LoginClient({ role, title, subtitle, accent, demoAccounts }: LoginClientProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    let navigating = false;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          expectedRole: role,
          remember,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed. Please check your credentials.");
        return;
      }

      const targetUrl: string = data.redirectTo || "/";

      // Verify whether browser stored the session cookie (handles cross-origin iframe environments)
      let cookieAccepted = false;
      try {
        const meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        cookieAccepted = meRes.ok;
      } catch {
        cookieAccepted = false;
      }

      navigating = true;

      if (cookieAccepted) {
        try {
          sessionStorage.removeItem("aircampus_token");
        } catch {
          // Ignore storage error
        }
        window.location.assign(targetUrl);
      } else if (data.token) {
        // Fallback for strict browsers blocking third-party cookies inside cross-origin iframes
        try {
          sessionStorage.setItem("aircampus_token", data.token);
        } catch {
          // Ignore storage error
        }
        const sep = targetUrl.includes("?") ? "&" : "?";
        window.location.assign(`${targetUrl}${sep}_st=${encodeURIComponent(data.token)}`);
      } else {
        window.location.assign(targetUrl);
      }
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      if (!navigating) {
        setLoading(false);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email/username and password.");
      return;
    }
    await performLogin(email, password);
  }

  function useDemo(account: (typeof demoAccounts)[0], autoSubmit = false) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    if (autoSubmit) {
      void performLogin(account.email, account.password);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    if (!forgotInput.trim()) {
      setForgotErr("Please enter your email or username.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotErr(data.error || "Request failed.");
      } else {
        setForgotMsg(data.message);
      }
    } catch {
      setForgotErr("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: decorative panel */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br ${accent}`}>
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute inset-0 bg-gradient-radial opacity-40" />
        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm w-fit">
            <ChevronLeft className="h-4 w-4" /> Back to home
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
                  <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg tracking-tight">AIR CAMPUS X</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Air University · Karachi</div>
              </div>
            </div>
            <h2 className="text-4xl font-bold tracking-tight leading-tight">
              Welcome to the
              <br />
              <span className="text-white/90">{title}</span>
            </h2>
            <p className="mt-4 text-white/80 max-w-md leading-relaxed">{subtitle}</p>
            <div className="mt-8 space-y-2 text-sm">
              {demoAccounts.slice(0, 2).map((a) => (
                <button
                  key={a.email}
                  type="button"
                  disabled={loading}
                  onClick={() => useDemo(a, true)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-between disabled:opacity-50"
                >
                  <div>
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-white/70 font-mono">{a.email}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90">
                    1-Click Login <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/50">
            Student-led innovation demo project · No real university credentials used
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 text-slate-600 hover:text-navy-800 text-sm mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-600 to-navy-900 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-navy-950">AIR CAMPUS X</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Air University · Karachi</div>
            </div>
          </div>

          {/* Role switcher tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-200/70 mb-6">
            {PORTAL_LINKS.map((p) => {
              const active = p.role === role;
              return (
                <Link
                  key={p.role}
                  href={p.href}
                  className={`text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-white text-navy-950 shadow-sm"
                      : "text-slate-600 hover:text-navy-900"
                  }`}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Sign in to {title}</h1>
            <p className="mt-1 text-sm text-slate-600">Enter your email or assigned username/ID to continue.</p>
          </div>

          <Card padding="md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email or Username"
                type="text"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@aircampus.demo or ID"
                leftIcon={<Mail className="h-4 w-4" />}
                required
                autoComplete="username"
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                  />
                  <span className="text-slate-700">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotInput(email);
                    setForgotMsg(null);
                    setForgotErr(null);
                    setForgotOpen(true);
                  }}
                  className="text-navy-700 hover:text-navy-900 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                Quick Demo Access (Click to Sign In)
              </div>
              <div className="space-y-2">
                {demoAccounts.map((a) => (
                  <div
                    key={a.email}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-300 hover:bg-slate-50 transition-colors"
                  >
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => useDemo(a, false)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="text-sm font-medium text-navy-900 truncate">{a.label}</div>
                      <div className="text-xs text-slate-500 font-mono truncate">{a.email}</div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => useDemo(a, false)}
                        className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-200/70"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => useDemo(a, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" /> Login
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="mt-6 text-xs text-slate-500 text-center">
            Protected by role-based access control · Server-validated sessions
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Account Password"
        maxWidth="sm"
      >
        {forgotMsg ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p>{forgotMsg}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setForgotOpen(false)}>Back to Sign in</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter your Air University email or assigned username/ID to request an administrator-verified password reset.
            </p>
            <Input
              label="Email or Username"
              value={forgotInput}
              onChange={(e) => setForgotInput(e.target.value)}
              placeholder="student@aircampus.demo"
              required
            />
            {forgotErr && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {forgotErr}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setForgotOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={forgotLoading}>
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
