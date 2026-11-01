"use client";
import { useState } from "react";
import { Plus, Database, Brain, ExternalLink, Search } from "lucide-react";
import { Card, CardHeader, Button, Input, Textarea, Select, Badge, Modal, PageHeader, EmptyState } from "@/components/ui";
import type { knowledgeDocuments } from "@/db/schema";
import type { AIProviderStatus } from "@/lib/ai";

type DocItem = typeof knowledgeDocuments.$inferSelect;

const CATEGORIES = [
  { value: "general", label: "General / Campus" },
  { value: "academics", label: "Academics & Programs" },
  { value: "admissions", label: "Admissions" },
  { value: "facility", label: "Facilities & Labs" },
  { value: "guide", label: "Platform Guide" },
  { value: "student_life", label: "Student Life & Societies" },
  { value: "policy", label: "University Policy" },
];

export function KnowledgeClient({
  initialDocs,
  aiStatus,
}: {
  initialDocs: DocItem[];
  aiStatus: AIProviderStatus;
}) {
  const [docs, setDocs] = useState<DocItem[]>(initialDocs);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("academics");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = search.trim()
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.content.toLowerCase().includes(search.toLowerCase()) ||
          d.category.toLowerCase().includes(search.toLowerCase())
      )
    : docs;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, content, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add document");
        return;
      }
      setDocs((prev) => [data.document, ...prev]);
      setTitle("");
      setContent("");
      setSource("");
      setModalOpen(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDoc(doc: DocItem) {
    const nextState = !doc.isActive;
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, isActive: nextState } : d)));
    await fetch("/api/knowledge", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, isActive: nextState }),
    }).catch(() => {});
  }

  return (
    <div>
      <PageHeader
        title="AI Knowledge Base & Engine Status"
        subtitle="Manage verified Air University Karachi documents powering RAG retrieval for the AI Campus & Teaching Assistants."
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Add Document
          </Button>
        }
      />

      {/* Active AI Provider Card */}
      <Card padding="md" className="mb-6 bg-gradient-to-br from-navy-50 to-cyan-50 ring-1 ring-navy-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-700 to-cyan-600 text-white flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-navy-950 text-sm">Active AI Engine: {aiStatus.label}</h3>
                <Badge variant="success">Model: {aiStatus.model}</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {aiStatus.isExternalLLM
                  ? `Connected via .env (${aiStatus.provider.toUpperCase()}) with automatic Hybrid RAG fallback.`
                  : "Running Built-in Hybrid RAG + Live PostgreSQL Engine. Add GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, or HUGGINGFACE_API_KEY in .env to enable cloud LLM generation."}
              </p>
            </div>
          </div>
          <Badge variant="navy">{docs.filter((d) => d.isActive).length} Active Docs</Badge>
        </div>
      </Card>

      {/* Documents List */}
      <Card padding="md">
        <CardHeader
          title={`Knowledge Documents (${filtered.length})`}
          action={
            <div className="relative w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter documents..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-navy-400"
              />
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState icon={<Database className="h-6 w-6" />} title="No matching documents" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <div key={d.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-navy-950">{d.title}</span>
                    <Badge variant="navy">{d.category}</Badge>
                    <Badge variant={d.isActive ? "success" : "default"}>
                      {d.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{d.content}</p>
                  {d.source && (
                    <a
                      href={d.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-navy-600 hover:underline"
                    >
                      {d.source} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => void toggleDoc(d)}>
                  {d.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Verified Knowledge Document">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Document Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Final Exam Rules & Guidelines"
            required
          />
          <Select
            label="Category *"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES}
          />
          <Textarea
            label="Verified Content *"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Enter verified Air University Karachi policy, guide, or facility details..."
            required
          />
          <Input
            label="Official Source URL (Optional)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://khi.au.edu.pk/..."
          />
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Save to Knowledge Base
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
