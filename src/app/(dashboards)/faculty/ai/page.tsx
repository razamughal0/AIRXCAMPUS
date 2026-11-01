import { DashboardShell } from "../../dashboard-shell";
import { AIChatClient, type Suggestion } from "../../student/ai/ai-chat-client";
import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Brain, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const suggestions: Suggestion[] = [
  { icon: "brain", q: "Generate a 5-question quiz on binary search trees" },
  { icon: "book", q: "Create a lesson plan for introducing SQL JOINs" },
  { icon: "graduation", q: "Suggest lab exercises for a machine learning course" },
  { icon: "building", q: "What are my assigned course sections and campus labs?" },
];

export default async function FacultyAIPage() {
  await requirePageRole("faculty");

  return (
    <DashboardShell role="faculty" title="AI Teaching Assistant">
      <PageHeader
        title="AI Teaching Assistant"
        subtitle="Generate quiz drafts, lesson plans, lab outlines, and search verified Air University Karachi guides. All AI drafts must be reviewed before publishing."
      />
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <AIChatClient
            suggestions={suggestions}
            module="teaching_assistant"
            assistantTitle="AI Teaching Assistant"
          />
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-navy-50 ring-1 ring-cyan-100 p-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-700 to-navy-700 text-white flex items-center justify-center mb-3">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-navy-950 text-sm">Teaching Assistant</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Helps faculty draft MCQ quizzes with answer keys, 60-minute lecture plans, lab
              assignment rubrics, and retrieve university documents.
            </p>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-slate-200 p-5">
            <h3 className="font-semibold text-navy-950 text-sm mb-2">Capabilities</h3>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {[
                "5-question MCQ quiz + answer key",
                "60-minute CLO-aligned lesson plan",
                "Lab & assignment grading rubric",
                "Summarize lecture concepts",
                "Check assigned course sections",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-cyan-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4 text-xs text-amber-900">
            <div className="font-semibold mb-1">Review Required</div>
            AI-generated academic content must be reviewed by faculty before sharing with students on AU LMS.
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
