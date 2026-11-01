"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildings, campusLocations } from "@/db/schema";
import { Button, Card, Input, Textarea, Select } from "@/components/ui";
import { Brain, Send, MapPin, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  buildings: (typeof buildings.$inferSelect)[];
  locations: (typeof campusLocations.$inferSelect)[];
}

const categories = [
  { value: "wifi_internet", label: "Wi-Fi & Internet" },
  { value: "classroom", label: "Classroom" },
  { value: "laboratory", label: "Laboratory" },
  { value: "electricity", label: "Electricity" },
  { value: "washroom", label: "Washroom" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "transport", label: "Transport" },
  { value: "library", label: "Library" },
  { value: "cafeteria", label: "Cafeteria" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

export function NewComplaintClient({ buildings, locations }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number; trackingId: string } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedCategory: string;
    priority: string;
    keywords: string[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function analyze() {
    if (!description.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/classify-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${title} ${description}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestion(data);
        if (!category) setCategory(data.suggestedCategory);
      }
    } catch {
      // Non-critical
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim() || !category) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          buildingId: buildingId ? Number(buildingId) : null,
          locationId: locationId ? Number(locationId) : null,
          roomDescription: roomDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        return;
      }
      setSuccess({ id: data.id, trackingId: data.trackingId });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const filteredLocations = buildingId
    ? locations.filter((l) => l.buildingId === Number(buildingId))
    : [];

  if (success) {
    return (
      <Card padding="lg" className="max-w-2xl">
        <div className="text-center py-8">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-navy-950">Complaint submitted</h2>
          <p className="mt-2 text-slate-600">Your tracking ID is:</p>
          <div className="mt-3 inline-block px-4 py-2 rounded-lg bg-navy-50 font-mono text-navy-900 font-semibold">
            {success.trackingId}
          </div>
          <p className="mt-4 text-sm text-slate-500 max-w-md mx-auto">
            You can track the status of your complaint from the complaints list. You'll also receive
            notifications when the status changes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/student/complaints")}>
              View all complaints
            </Button>
            <Button onClick={() => {
              setSuccess(null);
              setTitle(""); setDescription(""); setCategory("");
              setBuildingId(""); setLocationId(""); setRoomDescription("");
              setAiSuggestion(null);
            }}>
              Submit another
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="lg:col-span-2 space-y-5">
        <Card padding="md">
          <h3 className="font-semibold text-navy-950 mb-4">Issue Details</h3>
          <div className="space-y-4">
            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary (e.g. 'WiFi down in CS Lab A')"
              required
              maxLength={200}
            />
            <div>
              <Textarea
                label="Description *"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (e.target.value.length > 50 && !aiSuggestion) {
                    // Auto-analyze after enough text
                  }
                }}
                placeholder="Provide detailed information about the issue, when it started, and any relevant context..."
                rows={5}
                required
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={analyze}
                  disabled={analyzing || description.trim().length < 20}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900 disabled:opacity-50"
                >
                  {analyzing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {analyzing ? "Analyzing..." : "AI classify & suggest"}
                </button>
                <span className="text-xs text-slate-500">{description.length}/2000</span>
              </div>
            </div>
            <Select
              label="Category *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories}
              placeholder="Select a category"
              required
            />
          </div>
        </Card>

        <Card padding="md">
          <h3 className="font-semibold text-navy-950 mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Location
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Building"
              value={buildingId}
              onChange={(e) => {
                setBuildingId(e.target.value);
                setLocationId("");
              }}
              options={buildings.map((b) => ({ value: String(b.id), label: b.name }))}
              placeholder="Select building"
            />
            <Select
              label="Specific location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={filteredLocations.map((l) => ({ value: String(l.id), label: `${l.name} (Floor ${l.floor})` }))}
              placeholder={buildingId ? "Select location" : "Select building first"}
              disabled={!buildingId}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Additional location details"
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              placeholder="e.g. 'Near the entrance, second row of desks'"
              maxLength={200}
            />
          </div>
        </Card>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/student/complaints")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} leftIcon={<Send className="h-4 w-4" />}>
            Submit complaint
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        {aiSuggestion && (
          <Card padding="md" className="bg-gradient-to-br from-navy-50 to-cyan-50 ring-1 ring-navy-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-navy-700 to-cyan-600 text-white flex items-center justify-center">
                <Brain className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-navy-950 text-sm">AI Analysis</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-xs text-slate-500">Suggested category</div>
                <div className="font-medium text-navy-900">
                  {categories.find((c) => c.value === aiSuggestion.suggestedCategory)?.label || aiSuggestion.suggestedCategory}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Suggested priority</div>
                <div className="font-medium text-navy-900 capitalize">{aiSuggestion.priority}</div>
              </div>
              {aiSuggestion.keywords.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500">Detected keywords</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {aiSuggestion.keywords.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded-md bg-white text-xs text-navy-800 ring-1 ring-navy-200">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        <Card padding="md">
          <h3 className="font-semibold text-navy-950 text-sm mb-2">Tips for a good complaint</h3>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex gap-2"><span className="text-cyan-600">•</span>Be specific about the location</li>
            <li className="flex gap-2"><span className="text-cyan-600">•</span>Describe when the issue started</li>
            <li className="flex gap-2"><span className="text-cyan-600">•</span>Include any relevant context</li>
            <li className="flex gap-2"><span className="text-cyan-600">•</span>Mention if it's affecting others</li>
          </ul>
        </Card>
      </aside>
    </div>
  );
}
