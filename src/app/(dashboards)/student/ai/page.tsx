import { DashboardShell } from "../../dashboard-shell";
import { AIChatClient, type Suggestion } from "./ai-chat-client";
import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Brain, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const suggestions: Suggestion[] = [
  { icon: "graduation", q: "What programs does Air University Karachi offer?" },
  { icon: "book", q: "What are my enrolled courses and upcoming assignments?" },
  { icon: "building", q: "Tell me about the library services and hours" },
  { icon: "help", q: "How do I submit a complaint on AIR CAMPUS X?" },
];

export default async function StudentAIPage() {
  await requirePageRole("student");

  return (
    <DashboardShell role="student" title="AI Campus Assistant">
      <PageHeader
        title="AI Campus Assistant"
        subtitle="Ask anything about Air University Karachi in English or Roman Urdu. Answers are grounded in verified documents and your live academic profile."
      />
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <AIChatClient
            suggestions={suggestions}
            module="assistant"
            assistantTitle="AI Campus Assistant"
          />
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl bg-white ring-1 ring-slate-200 p-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-700 to-cyan-600 text-white flex items-center justify-center mb-3">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-navy-950 text-sm">Hybrid RAG Intelligence</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Combines verified Air University Karachi knowledge documents with live campus database
              context. Automatically connects to Gemini, Groq, OpenAI, OpenRouter, or Hugging Face
              when configured in <code>.env</code>.
            </p>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-slate-200 p-5">
            <h3 className="font-semibold text-navy-950 text-sm mb-2">Try asking about</h3>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {[
                "Programs in Computing & AI",
                "AUSOM & Social Sciences degrees",
                "My enrolled courses & CGPA",
                "My complaint tracking status",
                "Library hours & borrowing rules",
                "Upcoming campus events",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-cyan-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4 text-xs text-amber-900">
            <div className="font-semibold mb-1">Disclaimer</div>
            Always verify critical academic or administrative deadlines with your department or the
            official Air University Karachi website (khi.au.edu.pk).
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
