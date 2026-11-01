import Link from "next/link";
import {
  Brain,
  Building2,
  GraduationCap,
  ShieldCheck,
  Map,
  LineChart,
  Bell,
  MessageSquareQuote,
  ChevronRight,
  Sparkles,
  Users,
  Layers3,
  Fingerprint,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const roles = [
  {
    key: "student",
    title: "Student Portal",
    description: "Access courses, submit complaints, explore campus and chat with the AI assistant.",
    href: "/login/student",
    icon: GraduationCap,
    accent: "from-navy-500 to-navy-800",
  },
  {
    key: "faculty",
    title: "Faculty Portal",
    description: "Manage courses, assignments, attendance and access the AI teaching assistant.",
    href: "/login/faculty",
    icon: Users,
    accent: "from-cyan-500 to-cyan-700",
  },
  {
    key: "admin",
    title: "Administration",
    description: "Manage complaints, departments, facilities and campus operations.",
    href: "/login/admin",
    icon: ShieldCheck,
    accent: "from-emerald-500 to-emerald-700",
  },
  {
    key: "super-admin",
    title: "Super Admin",
    description: "Platform configuration, user management, audit logs and system health.",
    href: "/login/super-admin",
    icon: Fingerprint,
    accent: "from-amber-500 to-amber-700",
  },
] as const;

const features = [
  {
    icon: Brain,
    title: "AI Campus Assistant",
    desc: "Ask university-related questions and get answers grounded in verified knowledge documents.",
  },
  {
    icon: Map,
    title: "3D Digital Twin",
    desc: "Explore an interactive 3D campus map with buildings, labs, classrooms and facilities.",
  },
  {
    icon: MessageSquareQuote,
    title: "Smart Complaints",
    desc: "Submit complaints with AI-powered classification, priority suggestion and tracking.",
  },
  {
    icon: LineChart,
    title: "Analytics & Insights",
    desc: "Real-time dashboards for complaints, facilities and academic performance.",
  },
  {
    icon: Bell,
    title: "Unified Notifications",
    desc: "Stay informed with role-specific notifications for academics, events and updates.",
  },
  {
    icon: Layers3,
    title: "Modular Architecture",
    desc: "Extensible modules for events, lost & found, feedback, bookings and more.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <div className="font-bold text-navy-950 tracking-tight">AIR CAMPUS X</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Air University · Karachi
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-navy-800">
            <a href="#features" className="hover:text-navy-500">Features</a>
            <a href="#campus" className="hover:text-navy-500">Campus</a>
            <a href="#ai" className="hover:text-navy-500">AI Engine</a>
            <a href="#portals" className="hover:text-navy-500">Portals</a>
          </nav>
          <Link href="/login/student">
            <Button size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial" />
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-navy-200/60 text-xs font-medium text-navy-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              AI-Powered Smart Campus Ecosystem
            </div>
            <h1 className="mt-6 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-navy-950">
              One Campus.
              <br />
              One Intelligence.
              <br />
              <span className="bg-gradient-to-r from-navy-600 via-navy-800 to-cyan-600 bg-clip-text text-transparent">
                Infinite Possibilities.
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl">
              AIR CAMPUS X unifies students, faculty and administration of Air University Karachi
              through a single intelligent platform — with an AI assistant, interactive 3D campus,
              smart complaint management and real-time analytics.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login/student">
                <Button size="lg" rightIcon={<ChevronRight className="h-4 w-4" />}>
                  Enter Student Portal
                </Button>
              </Link>
              <Link href="#portals">
                <Button variant="secondary" size="lg">
                  Explore All Portals
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Conceptual 3D campus model</div>
              <div className="flex items-center gap-2"><Brain className="h-4 w-4" /> RAG-based AI assistant</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Role-based access control</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { k: "10+", v: "Academic Programs" },
            { k: "4", v: "Dedicated Portals" },
            { k: "11", v: "Complaint Categories" },
            { k: "7", v: "Campus Buildings" },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-3xl font-bold text-navy-900">{s.k}</div>
              <div className="text-sm text-slate-500 mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-accent">Platform capabilities</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-navy-950 tracking-tight">
            Every campus workflow, intelligently connected.
          </h2>
          <p className="mt-3 text-slate-600">
            From academic management to facility operations, AIR CAMPUS X integrates every
            stakeholder with contextual AI and actionable data.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} padding="md" className="group hover:-translate-y-0.5 transition-transform">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-navy-600 to-navy-900 text-white flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-navy-950">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Campus Preview */}
      <section id="campus" className="bg-navy-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.07]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">3D Digital Twin</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Navigate the campus in three dimensions.
            </h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              An interactive conceptual 3D model of Air University Karachi — explore buildings,
              locate classrooms and labs, and file complaints from exact locations.
              Administrators can replace the demo model with verified campus geometry.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-200">
              {["Clickable building information panels", "Floor and room navigation", "Location-aware complaint reporting", "Facility status indicators"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    </span>
                    {t}
                  </li>
                )
              )}
            </ul>
            <div className="mt-8">
              <Link href="/login/student">
                <Button size="lg" variant="secondary" rightIcon={<ChevronRight className="h-4 w-4" />}>
                  Launch 3D Campus
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950 ring-1 ring-white/10 shadow-2xl">
              <CampusPreviewSVG />
            </div>
            <div className="absolute -bottom-6 -left-6 glass-dark rounded-xl px-4 py-3 text-xs">
              <div className="text-cyan-300 font-semibold">Live Demo Mode</div>
              <div className="text-slate-300">Conceptual campus model · Replaceable with real geometry</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-xl overflow-hidden">
              <div className="bg-navy-950 px-5 py-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-400 font-mono">AI Campus Assistant</span>
              </div>
              <div className="p-5 space-y-3 bg-slate-50">
                <div className="flex justify-end">
                  <div className="bg-navy-900 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[80%]">
                    How do I register a complaint about the WiFi in CS Lab A?
                  </div>
                </div>
                <div className="flex">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[85%] ring-1 ring-slate-200">
                    <p className="text-navy-900">
                      To register a complaint about WiFi in CS Lab A on AIR CAMPUS X:
                    </p>
                    <ol className="mt-2 ml-4 list-decimal space-y-1 text-slate-700">
                      <li>Log in with your credentials.</li>
                      <li>Navigate to <b>Complaints → New Complaint</b>.</li>
                      <li>Category: <b>Wi-Fi and Internet</b>.</li>
                      <li>Building: <b>Computing & AI Block</b>, Location: <b>CS Lab A</b>.</li>
                    </ol>
                    <p className="mt-2 text-xs text-slate-500 italic">
                      Source: "How to Register a Complaint" — AIR CAMPUS X Knowledge Base
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-accent">
              AI Campus Assistant
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-navy-950 tracking-tight">
              Answers grounded in verified university knowledge.
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Our RAG-based assistant retrieves from an approved knowledge base — university guides,
              policies, handbooks and official announcements. When information isn&apos;t available, it
              says so instead of guessing.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                "Academic policies",
                "Admission guides",
                "Facility information",
                "Student handbooks",
                "Department contacts",
                "Event & society info",
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-navy-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-accent" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-accent">Role-based access</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-navy-950 tracking-tight">
              A dedicated portal for every stakeholder.
            </h2>
            <p className="mt-3 text-slate-600">
              Four distinct experiences — one unified intelligence. Every role has its own
              dashboard, navigation and permissions.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((r) => (
              <Link key={r.key} href={r.href} className="group">
                <Card padding="md" className="h-full hover:-translate-y-1 transition-transform">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${r.accent} text-white flex items-center justify-center mb-4`}>
                    <r.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-navy-950">{r.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed min-h-[3rem]">{r.description}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-navy-700 group-hover:gap-2 transition-all">
                    Enter portal <ChevronRight className="h-4 w-4" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Card padding="md" className="bg-navy-950 text-white border-0">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Demo Credentials
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    This is a student-led demonstration project. Use the demo accounts below to
                    explore each portal — no real university credentials are involved.
                  </p>
                </div>
                <Link href="/login/student">
                  <Button variant="secondary" size="md" rightIcon={<ChevronRight className="h-4 w-4" />}>
                    See demo accounts
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo />
              <div>
                <div className="font-bold text-navy-950">AIR CAMPUS X</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Air University · Karachi
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600 max-w-md">
              A student-led innovation project demonstrating an AI-powered smart university
              ecosystem. Not officially affiliated with or endorsed by Air University unless
              explicitly stated.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-navy-950 mb-3">Platform</div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#features" className="hover:text-navy-700">Features</a></li>
              <li><a href="#campus" className="hover:text-navy-700">3D Campus</a></li>
              <li><a href="#ai" className="hover:text-navy-700">AI Engine</a></li>
              <li><a href="#portals" className="hover:text-navy-700">Portals</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-navy-950 mb-3">Resources</div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="https://khi.au.edu.pk/" target="_blank" rel="noopener noreferrer" className="hover:text-navy-700">Official AU Karachi</a></li>
              <li><a href="/api/health" target="_blank" className="hover:text-navy-700">System Health</a></li>
              <li><Link href="/login/student" className="hover:text-navy-700">Sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>© {new Date().getFullYear()} AIR CAMPUS X · Student Innovation Project</div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-navy-600 via-navy-800 to-cyan-600 flex items-center justify-center shadow-md">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 6l5 3v6l-5 3-5-3V9l5-3z" fill="currentColor" fillOpacity="0.25" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function CampusPreviewSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="b1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="b2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#155e75" />
        </linearGradient>
        <linearGradient id="b3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id="b4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
      </defs>
      {/* Ground */}
      <ellipse cx="200" cy="260" rx="180" ry="30" fill="url(#ground)" />
      {/* Paths */}
      <path d="M80 260 L200 200 L320 260" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" fill="none" strokeDasharray="3 3" />
      <path d="M200 200 L200 120" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" fill="none" strokeDasharray="3 3" />

      {/* Building 1 - Main (center back) */}
      <g className="animate-float" style={{ animationDelay: "0s" }}>
        <polygon points="170,100 230,100 250,120 150,120" fill="#1e40af" opacity="0.6" />
        <rect x="150" y="120" width="100" height="80" fill="url(#b1)" />
        <polygon points="250,120 250,200 260,190 260,110" fill="#1e3a8a" />
        <g opacity="0.8">
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              {[0, 1, 2, 3].map((c) => (
                <rect key={c} x={160 + c * 22} y={130 + r * 16} width="12" height="8" fill="#fef3c7" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        <text x="200" y="95" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="600">MAIN BLOCK</text>
      </g>

      {/* Building 2 - CS Block (left) */}
      <g className="animate-float" style={{ animationDelay: "1s" }}>
        <polygon points="50,160 120,160 140,180 40,180" fill="#155e75" opacity="0.6" />
        <rect x="40" y="180" width="100" height="70" fill="url(#b2)" />
        <polygon points="140,180 140,250 150,240 150,170" fill="#0e7490" />
        <g opacity="0.8">
          {[0, 1, 2].map((r) => (
            <g key={r}>
              {[0, 1, 2].map((c) => (
                <rect key={c} x={50 + c * 28} y={190 + r * 18} width="16" height="10" fill="#fef3c7" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        <text x="90" y="155" textAnchor="middle" fill="#67e8f9" fontSize="7" fontWeight="600">CS BLOCK</text>
      </g>

      {/* Building 3 - Library (right) */}
      <g className="animate-float" style={{ animationDelay: "2s" }}>
        <polygon points="280,160 350,160 370,180 270,180" fill="#3730a3" opacity="0.6" />
        <rect x="270" y="180" width="100" height="70" fill="url(#b3)" />
        <polygon points="270,180 270,250 260,240 260,170" fill="#4c1d95" />
        <g opacity="0.8">
          {[0, 1].map((r) => (
            <g key={r}>
              {[0, 1, 2].map((c) => (
                <rect key={c} x={282 + c * 28} y={195 + r * 25} width="18" height="14" fill="#fef3c7" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        <text x="320" y="155" textAnchor="middle" fill="#c4b5fd" fontSize="7" fontWeight="600">LIBRARY</text>
      </g>

      {/* Building 4 - Admin (front) */}
      <g className="animate-float" style={{ animationDelay: "1.5s" }}>
        <polygon points="160,210 240,210 260,230 150,230" fill="#064e3b" opacity="0.6" />
        <rect x="150" y="230" width="110" height="40" fill="url(#b4)" />
        <polygon points="260,230 260,270 270,265 270,225" fill="#065f46" />
        <g opacity="0.8">
          {[0, 1, 2, 3].map((c) => (
            <rect key={c} x={162 + c * 24} y={242} width="14" height="12" fill="#fef3c7" opacity="0.8" />
          ))}
        </g>
        <text x="205" y="206" textAnchor="middle" fill="#6ee7b7" fontSize="7" fontWeight="600">ADMIN</text>
      </g>

      {/* Trees */}
      {[{ x: 30, y: 220 }, { x: 370, y: 220 }, { x: 100, y: 260 }, { x: 300, y: 265 }].map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y - 5} r="6" fill="#047857" opacity="0.7" />
          <rect x={t.x - 1} y={t.y} width="2" height="6" fill="#422006" />
        </g>
      ))}

      {/* Overlay info */}
      <g>
        <rect x="285" y="20" width="100" height="24" rx="4" fill="#0a1244" fillOpacity="0.7" />
        <text x="335" y="36" textAnchor="middle" fill="#67e8f9" fontSize="9" fontWeight="600">7 Buildings · 3D</text>
      </g>
    </svg>
  );
}
