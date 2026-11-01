// AIR CAMPUS X — Hybrid AI Engine
// Supports:
// 1. Multi-Provider External LLMs via .env (Google Gemini, Groq, OpenAI, OpenRouter, Hugging Face)
// 2. Built-in Hybrid RAG + Live PostgreSQL Campus Context + Faculty Teaching Assistant Engine
//    (works out-of-the-box with zero external API keys and acts as automatic fallback)

import { db } from "@/db";
import {
  knowledgeDocuments,
  complaints,
  aiInteractions,
  complaintCategoryEnum,
  departments,
  programs,
  buildings,
  campusLocations,
  events,
  announcements,
  enrollments,
  courseSections,
  courses,
  assignments,
  studentProfiles,
  facultyProfiles,
  systemSettings,
} from "@/db/schema";
import { eq, sql, desc, gt } from "drizzle-orm";
import {
  executeOpenRouterChat,
  getConfiguredOpenRouterModels,
  resolveOpenRouterModelId,
  type MultimodalMediaInput,
  type OpenRouterModelSpec,
} from "./openrouter";

export type { MultimodalMediaInput, OpenRouterModelSpec };

export type Doc = typeof knowledgeDocuments.$inferSelect;

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AISource {
  docId: number;
  title: string;
  snippet: string;
  category?: string;
  sourceUrl?: string | null;
}

export type AIProviderName =
  | "gemini"
  | "groq"
  | "openai"
  | "openrouter"
  | "huggingface"
  | "local_rag";

export interface AIProviderStatus {
  provider: AIProviderName;
  model: string;
  isExternalLLM: boolean;
  openRouterEnabled: boolean;
  openRouterKeyConfigured: boolean;
  openRouterKeySource: "env" | "database" | "none";
  openRouterModels: OpenRouterModelSpec[];
  googleApiEnabled: boolean;
  googleKeyConfigured: boolean;
  googleKeySource: "env" | "database" | "none";
  label: string;
  configuredProviders: AIProviderName[];
}

function isRealApiKey(val: string | undefined | null): val is string {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (trimmed.length < 12) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("your_") ||
    lower.includes("placeholder") ||
    lower.includes("replace_me") ||
    lower.includes("paste_your") ||
    lower.includes("xxxx") ||
    lower === "none" ||
    lower === "yes" ||
    lower === "true"
  ) {
    return false;
  }
  return true;
}

function isEnvTruthy(val: string | undefined, defaultVal = true): boolean {
  if (val === undefined || val.trim() === "") return defaultVal;
  return ["yes", "true", "1", "on", "enabled"].includes(val.trim().toLowerCase());
}

export function getEnvOpenRouterApiKey(): string | null {
  if (isRealApiKey(process.env.OPENROUTER_API_KEY)) {
    return process.env.OPENROUTER_API_KEY.trim();
  }
  return null;
}

export function getEnvGoogleApiKey(): string | null {
  const candidates = [
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ];
  for (const c of candidates) {
    if (isRealApiKey(c)) return c.trim();
  }
  return null;
}

interface RuntimeGoogleOverrides {
  dbOpenRouterKey?: string | null;
  dbOpenRouterEnabled?: boolean | null;
  dbGoogleKey?: string | null;
  dbGoogleEnabled?: boolean | null;
  dbProvider?: string | null;
  dbModel?: string | null;
}

async function loadRuntimeGoogleOverrides(): Promise<RuntimeGoogleOverrides> {
  try {
    const rows = await db.select().from(systemSettings);
    const map: Record<string, unknown> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return {
      dbOpenRouterKey:
        typeof map["ai.openrouter_api_key"] === "string" ? map["ai.openrouter_api_key"] : null,
      dbOpenRouterEnabled:
        typeof map["ai.openrouter_enabled"] === "boolean" ? map["ai.openrouter_enabled"] : null,
      dbGoogleKey: typeof map["ai.google_api_key"] === "string" ? map["ai.google_api_key"] : null,
      dbGoogleEnabled:
        typeof map["ai.google_api_enabled"] === "boolean" ? map["ai.google_api_enabled"] : null,
      dbProvider: typeof map["ai.provider"] === "string" ? map["ai.provider"] : null,
      dbModel: typeof map["ai.model"] === "string" ? map["ai.model"] : null,
    };
  } catch {
    return {};
  }
}

export function resolveOpenRouterApiKeySync(overrides?: RuntimeGoogleOverrides): {
  key: string | null;
  source: "env" | "database" | "none";
} {
  const envKey = getEnvOpenRouterApiKey();
  if (envKey) return { key: envKey, source: "env" };
  if (overrides?.dbOpenRouterKey && isRealApiKey(overrides.dbOpenRouterKey)) {
    return { key: overrides.dbOpenRouterKey.trim(), source: "database" };
  }
  return { key: null, source: "none" };
}

export function resolveGoogleApiKeySync(overrides?: RuntimeGoogleOverrides): {
  key: string | null;
  source: "env" | "database" | "none";
} {
  const envKey = getEnvGoogleApiKey();
  if (envKey) return { key: envKey, source: "env" };
  if (overrides?.dbGoogleKey && isRealApiKey(overrides.dbGoogleKey)) {
    return { key: overrides.dbGoogleKey.trim(), source: "database" };
  }
  return { key: null, source: "none" };
}

export function getAIProviderStatus(overrides?: RuntimeGoogleOverrides): AIProviderStatus {
  const openRouterModels = getConfiguredOpenRouterModels();

  const envOpenRouterEnabled = isEnvTruthy(process.env.OPENROUTER_ENABLED, true);
  const openRouterEnabled =
    overrides?.dbOpenRouterEnabled !== null && overrides?.dbOpenRouterEnabled !== undefined
      ? overrides.dbOpenRouterEnabled
      : envOpenRouterEnabled;

  const envGoogleEnabled = isEnvTruthy(
    process.env.GOOGLE_API_ENABLED ?? process.env.ENABLE_GOOGLE_API,
    true
  );
  const googleApiEnabled =
    overrides?.dbGoogleEnabled !== null && overrides?.dbGoogleEnabled !== undefined
      ? overrides.dbGoogleEnabled
      : envGoogleEnabled;

  const pref = (
    overrides?.dbProvider ||
    process.env.AI_PROVIDER ||
    (openRouterEnabled ? "openrouter" : googleApiEnabled ? "gemini" : "auto")
  )
    .trim()
    .toLowerCase();

  const resolvedOpenRouter = resolveOpenRouterApiKeySync(overrides);
  const resolvedGoogle = resolveGoogleApiKeySync(overrides);

  const hasOpenRouter = openRouterEnabled && Boolean(resolvedOpenRouter.key);
  const hasGemini = googleApiEnabled && Boolean(resolvedGoogle.key);
  const hasGroq = isRealApiKey(process.env.GROQ_API_KEY);
  const hasOpenAI = isRealApiKey(process.env.OPENAI_API_KEY);
  const hasHF = isRealApiKey(process.env.HUGGINGFACE_API_KEY);

  const configuredProviders: AIProviderName[] = [];
  if (hasOpenRouter) configuredProviders.push("openrouter");
  if (hasGemini) configuredProviders.push("gemini");
  if (hasGroq) configuredProviders.push("groq");
  if (hasOpenAI) configuredProviders.push("openai");
  if (hasHF) configuredProviders.push("huggingface");
  configuredProviders.push("local_rag");

  const openRouterDefaultModel = resolveOpenRouterModelId(
    overrides?.dbModel && overrides.dbModel.includes("/") ? overrides.dbModel : null
  );

  const geminiModel =
    (overrides?.dbModel && !overrides.dbModel.includes("/") && overrides.dbModel !== "demo-rag"
      ? overrides.dbModel
      : null) ||
    process.env.GOOGLE_GEMINI_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  const selectProvider = (): AIProviderName => {
    if (pref === "local_rag") return "local_rag";
    if (pref === "openrouter" && hasOpenRouter) return "openrouter";
    if ((pref === "gemini" || pref === "google") && hasGemini) return "gemini";
    if (pref === "groq" && hasGroq) return "groq";
    if (pref === "openai" && hasOpenAI) return "openai";
    if (pref === "huggingface" && hasHF) return "huggingface";

    // Auto-detect first configured external key (OpenRouter SDK prioritized)
    if (hasOpenRouter) return "openrouter";
    if (hasGemini) return "gemini";
    if (hasGroq) return "groq";
    if (hasOpenAI) return "openai";
    if (hasHF) return "huggingface";
    return "local_rag";
  };

  const provider = selectProvider();

  const baseStatus = {
    openRouterEnabled,
    openRouterKeyConfigured: Boolean(resolvedOpenRouter.key),
    openRouterKeySource: resolvedOpenRouter.source,
    openRouterModels,
    googleApiEnabled,
    googleKeyConfigured: Boolean(resolvedGoogle.key),
    googleKeySource: resolvedGoogle.source,
    configuredProviders,
  };

  switch (provider) {
    case "openrouter":
      return {
        ...baseStatus,
        provider,
        model: openRouterDefaultModel,
        isExternalLLM: true,
        label: "OpenRouter SDK (Gemini 2.5 · GPT 5.5 Pro · Grok 4.7)",
      };
    case "gemini":
      return {
        ...baseStatus,
        provider,
        model: geminiModel,
        isExternalLLM: true,
        label: "Google Gemini AI + Campus RAG",
      };
    case "groq":
      return {
        ...baseStatus,
        provider,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        isExternalLLM: true,
        label: "Groq Cloud LLM + Campus RAG",
      };
    case "openai":
      return {
        ...baseStatus,
        provider,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        isExternalLLM: true,
        label: "OpenAI + Campus RAG",
      };
    case "huggingface":
      return {
        ...baseStatus,
        provider,
        model: process.env.HUGGINGFACE_MODEL || "Qwen/Qwen2.5-72B-Instruct",
        isExternalLLM: true,
        label: "Hugging Face LLM + Campus RAG",
      };
    default:
      return {
        ...baseStatus,
        provider: "local_rag",
        model: openRouterEnabled
          ? `${openRouterDefaultModel} (Hybrid RAG Ready)`
          : "aircampus-hybrid-rag-v2",
        isExternalLLM: false,
        label: openRouterEnabled
          ? "OpenRouter SDK Ready · Hybrid RAG Active"
          : "Built-in Hybrid RAG Engine",
      };
  }
}

export async function getAIProviderStatusAsync(): Promise<AIProviderStatus> {
  const overrides = await loadRuntimeGoogleOverrides();
  return getAIProviderStatus(overrides);
}

// ============== TOKENIZATION & HYBRID RAG RETRIEVAL ==============

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "did", "do", "does",
  "for", "from", "give", "had", "has", "have", "hello", "help", "here", "hey", "hi",
  "how", "i", "if", "in", "into", "is", "it", "its", "just", "know", "let", "like",
  "make", "may", "me", "more", "most", "much", "my", "need", "of", "on", "one", "only",
  "or", "our", "out", "please", "provide", "give", "show", "some", "such", "tell",
  "than", "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "to", "up", "us", "use", "very", "want", "was", "we", "were", "what", "when",
  "where", "which", "who", "whom", "why", "will", "with", "would", "you", "your",
  // Common Roman Urdu conversational words
  "kya", "hai", "hain", "kaise", "kahan", "kab", "kon", "kaun", "mujhe", "batao",
  "batayen", "bata", "kar", "karna", "karun", "karein", "mein", "aur", "se", "ka",
  "ki", "ke", "ko", "par", "pe", "bhi", "ye", "wo", "koi", "sab", "salam", "aoa",
]);

const SYNONYM_EXPANSIONS: Record<string, string[]> = {
  program: ["programs", "degree", "bs", "bba", "academics", "undergraduate", "computing", "management", "social"],
  programs: ["program", "degree", "bs", "bba", "academics", "computing", "management", "social"],
  degree: ["programs", "bs", "bba", "academics"],
  course: ["courses", "lms", "registration", "academics", "semester"],
  courses: ["course", "lms", "registration", "academics", "semester"],
  register: ["registration", "complaint", "lms", "admissions", "enroll"],
  registration: ["register", "lms", "course", "admissions"],
  complaint: ["complaints", "register", "tracking", "issue", "guide"],
  complaints: ["complaint", "register", "tracking", "issue", "guide"],
  shikayat: ["complaint", "register", "issue", "guide"],
  issue: ["complaint", "support", "wifi", "laboratory"],
  problem: ["complaint", "support", "wifi", "laboratory"],
  submit: ["register", "complaint", "guide"],
  library: ["books", "reading", "journals", "borrow", "hours"],
  book: ["library", "reading", "borrow"],
  books: ["library", "reading", "borrow"],
  wifi: ["internet", "network", "it", "laboratory", "support"],
  internet: ["wifi", "network", "it", "support"],
  lab: ["laboratory", "labs", "computer", "computing", "ai", "cybersecurity"],
  labs: ["laboratory", "lab", "computer", "computing"],
  admission: ["admissions", "merit", "entry", "eligibility", "apply"],
  admissions: ["admission", "merit", "entry", "eligibility", "apply"],
  apply: ["admissions", "merit", "eligibility"],
  society: ["societies", "clubs", "events", "sports", "student_life"],
  societies: ["society", "clubs", "events", "sports", "student_life"],
  club: ["societies", "student_life"],
  event: ["events", "societies", "symposium", "student_life"],
  events: ["event", "societies", "symposium", "student_life"],
  map: ["3d", "digital", "twin", "building", "campus", "block"],
  building: ["buildings", "block", "campus", "3d", "facilities"],
  buildings: ["building", "block", "campus", "facilities"],
  facility: ["facilities", "library", "cafeteria", "sports", "auditorium", "labs"],
  facilities: ["facility", "library", "cafeteria", "sports", "auditorium", "labs"],
  calendar: ["semester", "examinations", "mid-term", "final", "fall", "lms"],
  exam: ["examinations", "mid-term", "final", "calendar", "lms"],
  exams: ["examinations", "mid-term", "final", "calendar", "lms"],
  lms: ["learning", "portal", "course", "registration", "assignments"],
  vision: ["mission", "about", "excellence"],
  mission: ["vision", "about", "excellence"],
  karachi: ["campus", "about", "programs"],
  lost: ["found", "student", "affairs"],
  found: ["lost", "student", "affairs"],
};

export function extractSearchTokens(query: string): {
  rawClean: string;
  primaryTokens: string[];
  expandedTokens: string[];
} {
  const rawClean = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = rawClean.split(" ").filter(Boolean);
  const primaryTokens = words.filter((w) => {
    if (STOP_WORDS.has(w)) return false;
    // Allow key 2-3 char campus acronyms like ai, cs, ds, cy, bs, it, au, lms, bba, ac
    if (["ai", "cs", "ds", "cy", "bs", "ms", "it", "au", "lms", "bba", "ac", "id", "3d"].includes(w)) {
      return true;
    }
    return w.length >= 3;
  });

  const expanded = new Set<string>(primaryTokens);
  for (const token of primaryTokens) {
    if (token.endsWith("s") && token.length > 4) {
      expanded.add(token.slice(0, -1));
    }
    const syns = SYNONYM_EXPANSIONS[token];
    if (syns) {
      syns.forEach((s) => expanded.add(s));
    }
  }

  return {
    rawClean,
    primaryTokens: [...new Set(primaryTokens)],
    expandedTokens: [...expanded],
  };
}

export async function searchKnowledgeBase(
  query: string,
  limit = 4
): Promise<{ doc: Doc; score: number }[]> {
  const { ensureDatabaseReady } = await import("@/db/bootstrap");
  await ensureDatabaseReady();
  const { rawClean, primaryTokens, expandedTokens } = extractSearchTokens(query);

  const allDocs = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.isActive, true))
    .orderBy(desc(knowledgeDocuments.createdAt));

  if (primaryTokens.length === 0) {
    return [];
  }

  // Filter out overly generic campus words if more specific tokens exist
  const genericWords = new Set(["air", "university", "karachi", "campus"]);
  const specificPrimary = primaryTokens.filter((t) => !genericWords.has(t));
  const effectivePrimary = specificPrimary.length > 0 ? specificPrimary : primaryTokens;

  const scored = allDocs.map((doc) => {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    const catLower = doc.category.toLowerCase();

    let score = 0;

    // Exact multi-word phrase bonus
    if (rawClean.length >= 5) {
      if (titleLower.includes(rawClean)) score += 20;
      if (contentLower.includes(rawClean)) score += 14;
    }

    // Primary tokens (strong weight)
    for (const tok of effectivePrimary) {
      const isGeneric = genericWords.has(tok);
      const weightMult = isGeneric ? 0.25 : 1;

      if (titleLower.includes(tok)) score += 8 * weightMult;
      if (catLower.includes(tok)) score += 5 * weightMult;
      if (contentLower.includes(tok)) score += 4 * weightMult;
    }

    // Expanded synonym tokens (moderate weight)
    for (const tok of expandedTokens) {
      if (effectivePrimary.includes(tok) || genericWords.has(tok)) continue;
      if (titleLower.includes(tok)) score += 3;
      if (catLower.includes(tok)) score += 2;
      if (contentLower.includes(tok)) score += 1.5;
    }

    return { doc, score };
  });

  return scored
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============== LIVE POSTGRESQL CAMPUS CONTEXT ==============

interface LiveCampusContext {
  sections: string[];
  personalSummary: string | null;
  programsSummary: string | null;
  buildingsSummary: string | null;
  eventsSummary: string | null;
}

async function buildLiveCampusContext(opts: {
  query: string;
  userId?: number | null;
  role?: string | null;
}): Promise<LiveCampusContext> {
  const q = opts.query.toLowerCase();
  const sections: string[] = [];
  let personalSummary: string | null = null;
  let programsSummary: string | null = null;
  let buildingsSummary: string | null = null;
  let eventsSummary: string | null = null;

  // 1. Personal / User-specific academic & complaint data
  const asksPersonal =
    /\b(my|mine|mera|meri|mere|enrolled|timetable|schedule|cgpa|gpa|assignment|assignments|deadline|status|profile)\b/.test(
      q
    );

  if (asksPersonal && opts.userId) {
    if (opts.role === "student" || !opts.role) {
      const [sp] = await db
        .select({ student: studentProfiles, program: programs })
        .from(studentProfiles)
        .leftJoin(programs, eq(programs.id, studentProfiles.programId))
        .where(eq(studentProfiles.userId, opts.userId))
        .limit(1);

      const myCourses = await db
        .select({ course: courses, section: courseSections })
        .from(enrollments)
        .innerJoin(courseSections, eq(courseSections.id, enrollments.sectionId))
        .innerJoin(courses, eq(courses.id, courseSections.courseId))
        .where(eq(enrollments.studentUserId, opts.userId));

      const myComplaints = await db
        .select()
        .from(complaints)
        .where(eq(complaints.submitterUserId, opts.userId))
        .orderBy(desc(complaints.createdAt))
        .limit(5);

      const sectionIds = myCourses.map((c) => c.section.id);
      const myAssignments =
        sectionIds.length > 0
          ? await db
              .select({ assignment: assignments, course: courses })
              .from(assignments)
              .innerJoin(courseSections, eq(courseSections.id, assignments.sectionId))
              .innerJoin(courses, eq(courses.id, courseSections.courseId))
              .where(
                sql`${assignments.sectionId} IN (${sql.join(
                  sectionIds.map((id) => sql`${id}`),
                  sql`, `
                )})`
              )
              .orderBy(assignments.dueDate)
              .limit(5)
          : [];

      if (sp || myCourses.length > 0 || myComplaints.length > 0) {
        const lines: string[] = [];
        if (sp) {
          lines.push(
            `- **Student Profile**: ID \`${sp.student.studentId}\` · ${
              sp.program?.name || "Enrolled Program"
            } · Semester ${sp.student.currentSemester}${
              sp.student.cgpa ? ` · CGPA: **${sp.student.cgpa.toFixed(2)}**` : ""
            }`
          );
        }
        if (myCourses.length > 0) {
          const courseList = myCourses
            .map((c) => {
              const sched = c.section.scheduleJson as {
                days?: string[];
                startTime?: string;
                room?: string;
              } | null;
              return `${c.course.code} ${c.course.name} (Sec ${c.section.sectionCode}${
                sched?.days ? `, ${sched.days.join("/")} ${sched.startTime || ""}` : ""
              }${sched?.room ? ` @ ${sched.room}` : ""})`;
            })
            .join("; ");
          lines.push(`- **Enrolled Courses (${myCourses.length})**: ${courseList}`);
        }
        if (myAssignments.length > 0) {
          const assignList = myAssignments
            .map(
              (a) =>
                `${a.course.code}: "${a.assignment.title}" (${a.assignment.totalMarks} marks, due ${a.assignment.dueDate.toLocaleDateString()})`
            )
            .join("; ");
          lines.push(`- **Upcoming Assignments (${myAssignments.length})**: ${assignList}`);
        }
        if (myComplaints.length > 0) {
          const compList = myComplaints
            .map((c) => `\`${c.trackingId}\` "${c.title}" — Status: **${c.status.replace("_", " ")}**`)
            .join("; ");
          lines.push(`- **Recent Complaints (${myComplaints.length})**: ${compList}`);
        }
        personalSummary = lines.join("\n");
        sections.push(`Authenticated Student Records:\n${personalSummary}`);
      }
    } else if (opts.role === "faculty") {
      const [fp] = await db
        .select({ faculty: facultyProfiles, dept: departments })
        .from(facultyProfiles)
        .leftJoin(departments, eq(departments.id, facultyProfiles.departmentId))
        .where(eq(facultyProfiles.userId, opts.userId))
        .limit(1);

      const mySections = await db
        .select({ section: courseSections, course: courses })
        .from(courseSections)
        .innerJoin(courses, eq(courses.id, courseSections.courseId))
        .where(eq(courseSections.facultyUserId, opts.userId));

      const lines: string[] = [];
      if (fp) {
        lines.push(
          `- **Faculty Profile**: ${fp.faculty.designation} (${fp.dept?.name || "Faculty"}) · Office: ${
            fp.faculty.officeRoom || "N/A"
          }`
        );
      }
      if (mySections.length > 0) {
        lines.push(
          `- **Assigned Sections (${mySections.length})**: ${mySections
            .map((s) => `${s.course.code} ${s.course.name} (Sec ${s.section.sectionCode})`)
            .join("; ")}`
        );
      }
      if (lines.length > 0) {
        personalSummary = lines.join("\n");
        sections.push(`Authenticated Faculty Records:\n${personalSummary}`);
      }
    }
  }

  // 2. Programs & Departments from DB
  if (
    /\b(program|programs|degree|degrees|department|departments|faculty|faculties|bs|bba|computing|management|ausom|social|fintech|cyber|aviation|psychology|english|data science|artificial intelligence|computer science|offer|offered)\b/.test(
      q
    )
  ) {
    const progs = await db
      .select({ program: programs, dept: departments })
      .from(programs)
      .innerJoin(departments, eq(departments.id, programs.departmentId))
      .where(eq(programs.isActive, true));

    if (progs.length > 0) {
      const byFaculty: Record<string, string[]> = {};
      for (const row of progs) {
        const fac = row.dept.faculty;
        if (!byFaculty[fac]) byFaculty[fac] = [];
        byFaculty[fac].push(`${row.program.name} (${row.program.durationYears} yrs, ${row.program.totalSemesters} semesters)`);
      }
      programsSummary = Object.entries(byFaculty)
        .map(([fac, list]) => `- **${fac}**: ${list.join(", ")}`)
        .join("\n");
      sections.push(`Verified Air University Karachi Academic Programs:\n${programsSummary}`);
    }
  }

  // 3. Campus Buildings, Rooms & Labs from DB
  if (
    /\b(building|buildings|block|room|rooms|lab|labs|laboratory|library|cafeteria|canteen|auditorium|sports|office|admissions|accounts|where|kahan|location|floor|map|3d|campus)\b/.test(
      q
    )
  ) {
    const blds = await db.select().from(buildings).where(eq(buildings.isActive, true));
    const locs = await db.select().from(campusLocations).where(eq(campusLocations.isActive, true));
    if (blds.length > 0) {
      buildingsSummary = blds
        .map((b) => {
          const bLocs = locs
            .filter((l) => l.buildingId === b.id)
            .map((l) => `${l.name} (Floor ${l.floor})`)
            .slice(0, 4);
          return `- **${b.name}** (${b.floors} floor${b.floors > 1 ? "s" : ""}): ${
            bLocs.length > 0 ? bLocs.join(", ") : (b.facilities || []).join(", ")
          }`;
        })
        .join("\n");
      sections.push(`Campus Buildings & Locations (Conceptual 3D Twin):\n${buildingsSummary}`);
    }
  }

  // 4. Upcoming Events & Pinned Announcements from DB
  if (
    /\b(event|events|symposium|seminar|workshop|career|cricket|tournament|announcement|announcements|notice|news|midterm|mid-term|upcoming)\b/.test(
      q
    )
  ) {
    const upcoming = await db
      .select()
      .from(events)
      .where(gt(events.startDate, new Date(Date.now() - 24 * 60 * 60 * 1000)))
      .orderBy(events.startDate)
      .limit(5);

    const recentAnn = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(3);

    const lines: string[] = [];
    if (upcoming.length > 0) {
      lines.push(
        ...upcoming.map(
          (e) =>
            `- **Event**: ${e.title} (${e.type}) — ${e.startDate.toLocaleDateString()} at ${
              e.location || "Campus"
            }`
        )
      );
    }
    if (recentAnn.length > 0) {
      lines.push(
        ...recentAnn.map((a) => `- **Announcement**: ${a.title} — ${a.content}`)
      );
    }
    if (lines.length > 0) {
      eventsSummary = lines.join("\n");
      sections.push(`Live Campus Events & Announcements:\n${eventsSummary}`);
    }
  }

  return {
    sections,
    personalSummary,
    programsSummary,
    buildingsSummary,
    eventsSummary,
  };
}

// ============== FACULTY AI TEACHING ASSISTANT GENERATOR ==============

function detectTeachingIntent(
  query: string,
  module?: string
): "quiz" | "lesson_plan" | "assignment" | "summary" | null {
  const q = query.toLowerCase();
  if (/\b(quiz|mcq|mcqs|multiple choice|test questions|question bank)\b/.test(q)) {
    return "quiz";
  }
  if (/\b(lesson plan|lecture plan|teaching plan|class plan)\b/.test(q)) {
    return "lesson_plan";
  }
  if (/\b(lab exercise|lab exercises|assignment outline|create an assignment|project idea|project ideas|grading rubric)\b/.test(q)) {
    return "assignment";
  }
  if (
    module === "teaching_assistant" &&
    /\b(summarize|summary|key concepts|lecture notes|outline)\b/.test(q)
  ) {
    return "summary";
  }
  if (/\b(summarize the key concepts|lecture notes on)\b/.test(q)) {
    return "summary";
  }
  return null;
}

function extractAcademicTopic(query: string): string {
  const cleaned = query
    .replace(
      /^(please\s+)?(generate|create|prepare|suggest|write|draft|make|summarize|give me)\s+(a\s+|an\s+|the\s+)?(\d+-question\s+|\d+\s+)?(mcq\s+|multiple choice\s+)?(quiz|questions|lesson plan|lecture plan|lab exercises?|assignment outline|key concepts|lecture notes|summary)\s*(on|for|about|in)?\s*(introducing\s+)?/i,
      ""
    )
    .replace(/[?.!]+$/, "")
    .trim();
  return cleaned.length >= 2 ? cleaned : "Core Computing Concepts";
}

function generateTeachingAssistantDraft(
  intent: "quiz" | "lesson_plan" | "assignment" | "summary",
  query: string
): string {
  const topic = extractAcademicTopic(query);
  const lowerTopic = topic.toLowerCase();

  if (intent === "quiz") {
    if (lowerTopic.includes("binary search tree") || lowerTopic.includes("bst") || lowerTopic.includes("avl")) {
      return `### Draft Quiz: Binary Search Trees (BST & Balancing)
**Course Level:** BS Computing & AI · **Total Marks:** 10 (2 marks each)

1. **What is the average-case time complexity of searching for a key in a balanced Binary Search Tree with \`n\` nodes?**
   - A) \`O(n)\`
   - B) \`O(log n)\`
   - C) \`O(n log n)\`
   - D) \`O(1)\`

2. **Which traversal of a Binary Search Tree always visits the keys in non-decreasing (sorted) order?**
   - A) Pre-order traversal
   - B) Post-order traversal
   - C) In-order traversal
   - D) Level-order traversal

3. **When deleting a node with TWO children in a BST, which node is standardly used as its replacement?**
   - A) The root node of the tree
   - B) Its in-order successor (smallest node in the right subtree) or in-order predecessor
   - C) Any leaf node in the left subtree
   - D) Its parent node

4. **In the worst case (when elements are inserted in already sorted order into an unbalanced BST), what does the height of the tree become?**
   - A) \`O(log n)\`
   - B) \`O(sqrt(n))\`
   - C) \`O(n - 1)\`
   - D) \`O(1)\`

5. **In an AVL tree, the balance factor of every node must be maintained within which set of values?**
   - A) \`{0, 1, 2}\`
   - B) \`{-1, 0, +1}\`
   - C) \`{-2, -1, 0, +1, +2}\`
   - D) Any non-negative integer

---
**Answer Key (Faculty Reference Only):**
1. **B** (\`O(log n)\`) · 2. **C** (In-order) · 3. **B** (In-order successor/predecessor) · 4. **C** (\`O(n - 1)\` skewed tree) · 5. **B** (\`{-1, 0, +1}\`)

_Faculty Review Notice: Please review and verify all AI-generated assessment items before publishing to AU LMS._`;
    }

    if (lowerTopic.includes("sql") || lowerTopic.includes("join") || lowerTopic.includes("database")) {
      return `### Draft Quiz: ${topic}
**Course Level:** BS Computing & AI (Database Systems) · **Total Marks:** 10

1. **Which SQL JOIN returns only rows that have matching values in both tables?**
   - A) LEFT OUTER JOIN
   - B) RIGHT OUTER JOIN
   - C) INNER JOIN
   - D) FULL OUTER JOIN

2. **A relation is in Second Normal Form (2NF) if it is in 1NF and contains no:**
   - A) Multivalued attributes
   - B) Partial functional dependencies on a composite primary key
   - C) Transitive dependencies
   - D) Foreign keys

3. **What does a \`LEFT JOIN\` return when there is no match in the right table?**
   - A) The row is excluded completely
   - B) An error is raised
   - C) All columns from the left table with \`NULL\` values for columns of the right table
   - D) Duplicate rows from the right table

4. **Which clause is properly used to filter grouped aggregate results in SQL?**
   - A) WHERE
   - B) HAVING
   - C) ORDER BY
   - D) DISTINCT

5. **Eliminating transitive dependencies between non-prime attributes achieves which normal form?**
   - A) 1NF
   - B) 2NF
   - C) 3NF
   - D) Unnormalized Form

---
**Answer Key (Faculty Reference Only):**
1. **C** · 2. **B** · 3. **C** · 4. **B** · 5. **C**

_Faculty Review Notice: Please review and verify all AI-generated assessment items before publishing to AU LMS._`;
    }

    return `### Draft 5-Question Quiz: ${topic}
**Course Level:** Undergraduate (Air University Karachi) · **Total Marks:** 10

1. **Which statement best defines the primary purpose and core principle of ${topic}?**
   - A) Unstructured ad-hoc execution without formal constraints
   - B) Systematic modeling, efficiency, and verifiable correctness within ${topic}
   - C) Hardware-only optimization unrelated to software design
   - D) Static storage with no runtime operations

2. **When analyzing performance and scalability in ${topic}, which factor is most critical?**
   - A) Computational/operational complexity as input size grows
   - B) Variable naming length in source files
   - C) Screen resolution of the client terminal
   - D) File creation timestamp

3. **Which design trade-off commonly arises when implementing ${topic} in production systems?**
   - A) Balancing time efficiency, memory/resource usage, and maintainability
   - B) Eliminating all validation checks
   - C) Hardcoding credentials in source code
   - D) Disabling error handling

4. **During validation and testing of ${topic}, edge-case testing ensures:**
   - A) Only average inputs succeed
   - B) Boundary conditions, empty inputs, and high-load cases behave predictably
   - C) Documentation is skipped
   - D) Compiler warnings are ignored

5. **How does ${topic} integrate into broader software and AI engineering workflows?**
   - A) As an isolated theoretical concept with no practical application
   - B) As a foundational building block supporting modular, reliable system design
   - C) Only in legacy mainframe systems
   - D) Without any data structures or algorithms

---
**Answer Key (Faculty Reference Only):**
1. **B** · 2. **A** · 3. **A** · 4. **B** · 5. **B**

_Faculty Review Notice: Please customize domain-specific values and review before publishing to students._`;
  }

  if (intent === "lesson_plan") {
    return `### 60-Minute Lecture & Lesson Plan: ${topic}
**Target Audience:** BS Undergraduate Section (Air University Karachi)

#### 1. Course Learning Outcomes (CLOs)
By the end of this session, students will be able to:
- Explain the foundational concepts and motivation behind **${topic}**.
- Trace real-world examples and write working implementations/queries for **${topic}**.
- Identify common pitfalls, edge cases, and performance considerations.

#### 2. Session Timeline
- **00–10 min — Warm-Up & Hook:** Review prerequisite concepts and present a practical campus/industry scenario motivating **${topic}**.
- **10–30 min — Core Concept & Live Demonstration:** Visual walkthrough of **${topic}**, step-by-step execution trace, and syntax/architecture breakdown.
- **30–48 min — Guided In-Class Activity:** Pair problem-solving exercise where students solve 2 progressive problems on **${topic}**.
- **48–55 min — Formative Check & Q&A:** Quick 3-question concept poll and discussion of common mistakes.
- **55–60 min — Wrap-Up & Next Steps:** Summary of key takeaways and preview of upcoming lab task on AU LMS.

#### 3. Recommended Teaching Resources
- Lecture slides + live coding / query sandbox
- Practice worksheet uploaded to **AU LMS**

_Faculty Review Notice: AI-drafted lesson plan — adjust pacing and CLO alignment for your specific course section._`;
  }

  if (intent === "assignment") {
    return `### Draft Lab / Assignment Outline: ${topic}
**Suggested Weightage:** 30 Marks · **Estimated Completion Time:** 1 Week

#### Objectives
- Apply theoretical principles of **${topic}** to a hands-on engineering problem.
- Practice clean modular implementation, testing, and technical documentation.

#### Practical Tasks
1. **Task 1 — Core Implementation (12 Marks):** Build and verify the foundational workflow/model for **${topic}** using clean, modular code.
2. **Task 2 — Edge Cases & Optimization (10 Marks):** Handle boundary inputs, benchmark behavior on realistic datasets, and document trade-offs.
3. **Task 3 — Analytical Reflection & Demo (8 Marks):** Submit a concise 1–2 page report explaining results, observations, and test cases.

#### Submission & Grading Rubric
- **Correctness & Test Coverage:** 40%
- **Code / Design Quality & Efficiency:** 35%
- **Documentation & Clarity:** 25%

_Faculty Review Notice: Review deadlines, marks distribution, and submission format before posting to students._`;
  }

  // Summary / Lecture notes
  return `### Structured Concept Summary: ${topic}

#### Core Overview
- **${topic}** is a foundational topic in undergraduate computing/academic curricula focused on structured design, consistency, and efficient problem solving.

#### Key Principles to Emphasize
1. **Formal Definition & Purpose:** Understand *why* **${topic}** is needed and what anomalies or inefficiencies it prevents.
2. **Step-by-Step Mechanics:** Break complex operations into clear, verifiable rules (e.g., normal forms 1NF → 2NF → 3NF → BCNF, or algorithmic invariants).
3. **Practical Application:** Pair every theoretical rule with a concrete worked example so students can trace inputs to outputs.
4. **Common Pitfalls:** Highlight edge cases and trade-offs encountered in real systems.

#### Quick Revision Questions for Students
- What problem arises if the rules of **${topic}** are violated?
- Walk through a small concrete example demonstrating **${topic}** step by step.

_Faculty Review Notice: Please review and adapt these summary notes to your course syllabus before distribution._`;
}

// ============== EXTERNAL LLM CALLER ==============

async function callExternalLLM(opts: {
  providerStatus: AIProviderStatus;
  openRouterApiKey?: string | null;
  googleApiKey?: string | null;
  requestedModel?: string | null;
  media?: MultimodalMediaInput;
  systemPrompt: string;
  query: string;
  history: ChatHistoryTurn[];
}): Promise<{
  text: string;
  model: string;
  tokensUsed?: number;
  reasoningTokens?: number | null;
  streamed?: boolean;
}> {
  const maxTokens = Number(process.env.AI_MAX_TOKENS || "1100") || 1100;
  const temperature = Number(process.env.AI_TEMPERATURE || "0.3") || 0.3;
  const { provider, model } = opts.providerStatus;

  const trimmedHistory = (opts.history || []).slice(-6);

  // 1. OpenRouter SDK (@openrouter/sdk): google/gemini-2.5-flash, openai/gpt-5.5-pro, x-ai/grok-4.7
  if (provider === "openrouter") {
    const apiKey = (opts.openRouterApiKey || getEnvOpenRouterApiKey() || "").trim();
    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured yet.");
    }
    const targetModel = resolveOpenRouterModelId(opts.requestedModel || model);
    const orResult = await executeOpenRouterChat({
      apiKey,
      model: targetModel,
      systemPrompt: opts.systemPrompt,
      history: trimmedHistory,
      userText: opts.query,
      media: opts.media,
      temperature,
      maxTokens,
    });

    return {
      text: orResult.text,
      model: orResult.model,
      tokensUsed: orResult.totalTokens,
      reasoningTokens: orResult.reasoningTokens,
      streamed: orResult.streamed,
    };
  }

  // 2. Direct Google Gemini REST API
  if (provider === "gemini") {
    const apiKey = (opts.googleApiKey || getEnvGoogleApiKey() || "").trim();
    if (!apiKey) {
      throw new Error("Google API key is not configured yet.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = [
      ...trimmedHistory.map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: opts.query }] },
    ];

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemPrompt }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
      signal: AbortSignal.timeout(18000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || "";
    if (!text) throw new Error("Empty response from Gemini API");

    return {
      text,
      model,
      tokensUsed: data?.usageMetadata?.totalTokenCount,
    };
  }

  // 3. Direct OpenAI-compatible providers: groq, openai, huggingface
  let endpoint = "https://api.openai.com/v1/chat/completions";
  let apiKey = "";

  if (provider === "groq") {
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    apiKey = process.env.GROQ_API_KEY!.trim();
  } else if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    apiKey = process.env.OPENAI_API_KEY!.trim();
  } else if (provider === "huggingface") {
    endpoint = "https://router.huggingface.co/v1/chat/completions";
    apiKey = process.env.HUGGINGFACE_API_KEY!.trim();
  }

  const messages = [
    { role: "system", content: opts.systemPrompt },
    ...trimmedHistory.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: opts.query },
  ];

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(18000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${provider} API HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error(`Empty response from ${provider} API`);

  return {
    text,
    model,
    tokensUsed: data?.usage?.total_tokens,
  };
}

// ============== BUILT-IN HYBRID RAG SYNTHESIS ==============

function isGreetingOrCapabilitiesQuery(query: string): boolean {
  const clean = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
  if (!clean) return true;
  const greetings = [
    "hi",
    "hello",
    "hey",
    "salam",
    "assalam o alaikum",
    "assalamu alaikum",
    "aoa",
    "good morning",
    "good afternoon",
    "good evening",
    "help",
    "who are you",
    "what can you do",
    "kaise ho",
    "ap kya kar sakte ho",
    "kya madad kar sakte ho",
  ];
  return greetings.includes(clean);
}

function synthesizeBuiltInAnswer(opts: {
  query: string;
  docs: Doc[];
  liveContext: LiveCampusContext;
  module?: string;
  role?: string | null;
}): string {
  // 1. Teaching assistant intents (Quizzes, Lesson plans, Lab outlines, Summaries)
  const teachingIntent = detectTeachingIntent(opts.query, opts.module);
  if (teachingIntent) {
    return generateTeachingAssistantDraft(teachingIntent, opts.query);
  }

  // 2. Conversational greeting / help
  if (isGreetingOrCapabilitiesQuery(opts.query) && opts.docs.length === 0 && opts.liveContext.sections.length === 0) {
    if (opts.module === "teaching_assistant" || opts.role === "faculty") {
      return `Hello! I am the **AIR CAMPUS X Teaching & Academic Assistant** for **Air University Karachi Campus**.

Here is how I can assist you today:
- **Quiz & MCQ Generation:** Ask e.g. *"Generate a 5-question quiz on binary search trees"*
- **Lesson & Lecture Plans:** Ask e.g. *"Create a lesson plan for introducing SQL JOINs"*
- **Assignment & Lab Outlines:** Ask e.g. *"Suggest 3 lab exercises for a machine learning course"*
- **University Knowledge & Schedule:** Ask about your assigned courses, campus labs, academic calendar, or university policies.`;
    }

    return `Assalam-o-Alaikum & Hello! I am the **AIR CAMPUS X AI Assistant** for **Air University Karachi Campus**.

You can ask me about:
- **Academic Programs & Admissions:** Computing & AI, AUSOM Management, and Social Sciences degrees
- **Campus Facilities & 3D Map:** Buildings, labs (CS Lab A/B, AI Lab), Central Library hours, Cafeteria, and Auditorium
- **Smart Complaints:** Step-by-step guide to submitting or checking your campus complaints
- **Your Personal Dashboard:** Ask *"What are my enrolled courses?"*, *"Show my upcoming assignments"*, or *"Check my complaint status"*
- **Events & Student Societies:** Upcoming seminars, workshops, and campus societies`;
  }

  // 3. Combine Personal + Live DB + Retrieved Knowledge Base Docs cleanly
  const hasDocs = opts.docs.length > 0;
  const hasLive = opts.liveContext.sections.length > 0;

  if (!hasDocs && !hasLive) {
    return `I do not have verified information on **"${opts.query}"** in the Air University Karachi knowledge base yet.

To avoid providing unverified details:
- Please check the official Air University Karachi website: https://khi.au.edu.pk/
- Or contact the relevant department / **Student Affairs Office** (Administration Building, Floor 1).`;
  }

  const parts: string[] = [];

  if (opts.liveContext.personalSummary) {
    parts.push("### Your Campus Summary");
    parts.push(opts.liveContext.personalSummary);
    parts.push("");
  }

  if (opts.liveContext.programsSummary && !opts.liveContext.personalSummary) {
    parts.push("### Verified Academic Programs (Air University Karachi)");
    parts.push(opts.liveContext.programsSummary);
    parts.push("");
  }

  if (hasDocs) {
    // Lead with the highest-scoring document naturally
    const top = opts.docs[0];
    parts.push(`### ${top.title}`);
    parts.push(top.content);
    if (top.source) {
      parts.push(`Official Reference: ${top.source}`);
    }
    parts.push("");

    // Include up to 2 additional supporting documents concisely
    const supporting = opts.docs.slice(1, 3);
    if (supporting.length > 0) {
      parts.push("#### Related Verified Information");
      for (const d of supporting) {
        parts.push(`- **${d.title}:** ${d.content}`);
      }
      parts.push("");
    }
  }

  if (opts.liveContext.buildingsSummary && !hasDocs) {
    parts.push("### Campus Buildings & Facilities");
    parts.push(opts.liveContext.buildingsSummary);
    parts.push("");
  }

  if (opts.liveContext.eventsSummary) {
    parts.push("### Upcoming Campus Events & Announcements");
    parts.push(opts.liveContext.eventsSummary);
    parts.push("");
  }

  parts.push(
    "_Note: Grounded in the Air University Karachi knowledge base & live campus records. Confirm critical deadlines with your department._"
  );

  return parts.join("\n").trim();
}

// ============== MAIN CHAT ENTRYPOINT ==============

export async function aiChat(opts: {
  query: string;
  userId?: number | null;
  role?: string | null;
  module?: string;
  model?: string | null;
  media?: MultimodalMediaInput;
  history?: ChatHistoryTurn[];
}): Promise<{
  answer: string;
  sources: AISource[];
  provider: string;
  model: string;
  reasoningTokens?: number | null;
  streamed?: boolean;
}> {
  // Check if AI module is disabled in system_settings
  try {
    const [aiFlag] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "ai.enabled"))
      .limit(1);
    if (aiFlag && aiFlag.value === false) {
      return {
        answer: "The AI Campus Assistant is currently disabled by the Super Administrator.",
        sources: [],
        provider: "disabled",
        model: "none",
      };
    }
  } catch {
    // Continue if settings lookup fails
  }

  const scoredDocs = await searchKnowledgeBase(opts.query, 4);
  const docs = scoredDocs.map((s) => s.doc);
  const liveContext = await buildLiveCampusContext({
    query: opts.query,
    userId: opts.userId,
    role: opts.role,
  });

  const overrides = await loadRuntimeGoogleOverrides();
  const resolvedOpenRouter = resolveOpenRouterApiKeySync(overrides);
  const resolvedGoogle = resolveGoogleApiKeySync(overrides);
  const providerStatus = getAIProviderStatus(overrides);

  let answer = "";
  let tokensUsed: number | undefined;
  let reasoningTokens: number | null | undefined = null;
  let streamed = false;
  let activeProvider = providerStatus.provider;
  let activeModel = opts.model ? resolveOpenRouterModelId(opts.model) : providerStatus.model;

  if (providerStatus.isExternalLLM) {
    const kbText =
      docs.length > 0
        ? docs
            .map(
              (d, idx) =>
                `[Doc ${idx + 1}: ${d.title} (${d.category})]\n${d.content}${
                  d.source ? `\nSource: ${d.source}` : ""
                }`
            )
            .join("\n\n")
        : "No direct document matched in knowledge_documents.";

    const liveText =
      liveContext.sections.length > 0
        ? liveContext.sections.join("\n\n")
        : "No additional live database tables triggered.";

    const systemPrompt = [
      "You are the official AIR CAMPUS X AI Assistant for Air University Karachi Campus, Pakistan.",
      "AIR CAMPUS X is a student-led smart campus innovation platform connecting Students, Faculty, and Administration.",
      opts.module === "teaching_assistant"
        ? "You are operating in Faculty AI Teaching Assistant mode: you may generate quiz drafts, lesson plans, assignment outlines, and lecture summaries, and remind faculty to review AI-generated content before publishing."
        : "You are helping university stakeholders with verified Air University Karachi information, procedures, facilities, multimodal analysis, and personal dashboard queries.",
      "CRITICAL RULES:",
      "1. Ground university facts strictly in the Verified Knowledge Base and Live Campus Context provided below.",
      "2. If the user provides multimodal attachments (images, audio, or video) or general academic/reasoning problems, analyze and answer them accurately.",
      "3. Never invent faculty names, private records, unverified room numbers, or fake policies. If university-specific information is unavailable in the context, state clearly that verified information is not available and suggest checking https://khi.au.edu.pk/ or the relevant department.",
      "4. Respond clearly in clean Markdown. If the user writes in Roman Urdu, reply helpfully in clear Roman Urdu / English.",
      "",
      "=== VERIFIED KNOWLEDGE BASE ===",
      kbText,
      "",
      "=== LIVE CAMPUS DATABASE CONTEXT ===",
      liveText,
    ].join("\n");

    try {
      const llmRes = await callExternalLLM({
        providerStatus,
        openRouterApiKey: resolvedOpenRouter.key,
        googleApiKey: resolvedGoogle.key,
        requestedModel: opts.model,
        media: opts.media,
        systemPrompt,
        query: opts.query,
        history: opts.history || [],
      });
      answer = llmRes.text;
      activeModel = llmRes.model || activeModel;
      tokensUsed = llmRes.tokensUsed;
      reasoningTokens = llmRes.reasoningTokens ?? null;
      streamed = Boolean(llmRes.streamed);
    } catch (err) {
      console.warn(
        `[AIR CAMPUS X AI] External provider (${providerStatus.provider}) failed, falling back to Built-in Hybrid RAG:`,
        err
      );
      activeProvider = "local_rag";
      activeModel = "aircampus-hybrid-rag-v2";
      answer = synthesizeBuiltInAnswer({
        query: opts.query,
        docs,
        liveContext,
        module: opts.module,
        role: opts.role,
      });
    }
  } else {
    const hasMedia = Boolean(
      opts.media?.imageUrl?.trim() ||
        opts.media?.videoUrl?.trim() ||
        opts.media?.inputAudio?.data?.trim()
    );
    answer = synthesizeBuiltInAnswer({
      query: opts.query,
      docs,
      liveContext,
      module: opts.module,
      role: opts.role,
    });
    if (hasMedia) {
      answer =
        `> **Multimodal Attachment Ready:** Paste your \`OPENROUTER_API_KEY\` in \`.env\` (or Super Admin → System Configuration) to analyze images, audio, and video live with \`google/gemini-2.5-flash\` via \`@openrouter/sdk\`.\n\n` +
        answer;
    }
  }

  const isPureTeachingDraft =
    activeProvider === "local_rag" && Boolean(detectTeachingIntent(opts.query, opts.module));

  const sources: AISource[] = isPureTeachingDraft
    ? []
    : docs.map((d) => ({
        docId: d.id,
        title: d.title,
        snippet: d.content.slice(0, 220),
        category: d.category,
        sourceUrl: d.source,
      }));

  try {
    await db.insert(aiInteractions).values({
      userId: opts.userId ?? null,
      module: opts.module || "assistant",
      prompt: opts.query,
      response: answer,
      sources: sources.map(({ docId, title, snippet }) => ({ docId, title, snippet })),
      tokensUsed: tokensUsed ?? null,
    });
  } catch {
    // Non-critical logging error
  }

  return {
    answer,
    sources,
    provider: activeProvider,
    model: activeModel,
    reasoningTokens,
    streamed,
  };
}

// ============== COMPLAINT INTELLIGENCE ==============

export function classifyComplaint(text: string): {
  suggestedCategory: (typeof complaintCategoryEnum.enumValues)[number];
  priority: "low" | "medium" | "high" | "urgent";
  keywords: string[];
  recommendedDepartmentCode: string;
} {
  const lower = text.toLowerCase();
  const categoryMap: Record<
    (typeof complaintCategoryEnum.enumValues)[number],
    { words: string[]; dept: string }
  > = {
    wifi_internet: {
      words: ["wifi", "wi-fi", "internet", "network", "connectivity", "bandwidth", "lan", "router"],
      dept: "CS",
    },
    classroom: {
      words: ["classroom", "projector", "whiteboard", "multimedia", "chair", "desk", "lecture hall"],
      dept: "ADMIN",
    },
    laboratory: {
      words: ["lab", "computer", "software", "equipment", "hardware", "workstation", "python", "gpu"],
      dept: "CS",
    },
    electricity: {
      words: ["electricity", "power", "light", "outage", "load shedding", "ups", "generator", "ac", "air conditioning", "voltage"],
      dept: "ADMIN",
    },
    washroom: {
      words: ["washroom", "toilet", "restroom", "water", "tap", "plumbing", "leakage"],
      dept: "ADMIN",
    },
    cleanliness: {
      words: ["clean", "cleanliness", "dust", "trash", "garbage", "smell", "hygiene", "sweeping"],
      dept: "ADMIN",
    },
    transport: {
      words: ["bus", "transport", "shuttle", "parking", "vehicle", "van", "route"],
      dept: "ADMIN",
    },
    library: {
      words: ["library", "book", "reading hall", "study room", "journal"],
      dept: "ADMIN",
    },
    cafeteria: {
      words: ["cafeteria", "food", "canteen", "meal", "lunch", "dining", "hygiene"],
      dept: "ADMIN",
    },
    security: {
      words: ["security", "guard", "cctv", "camera", "theft", "safety", "gate", "id card", "unauthorized"],
      dept: "ADMIN",
    },
    other: {
      words: [],
      dept: "ADMIN",
    },
  };

  let bestCategory: (typeof complaintCategoryEnum.enumValues)[number] = "other";
  let bestScore = 0;
  let recommendedDepartmentCode = "ADMIN";
  const matchedKeywords: string[] = [];

  for (const [category, cfg] of Object.entries(categoryMap)) {
    const hits = cfg.words.filter((w) => lower.includes(w));
    if (hits.length > 0) {
      matchedKeywords.push(...hits);
    }
    if (hits.length > bestScore) {
      bestScore = hits.length;
      bestCategory = category as (typeof complaintCategoryEnum.enumValues)[number];
      recommendedDepartmentCode = cfg.dept;
    }
  }

  const urgentWords = ["urgent", "emergency", "immediately", "danger", "fire", "spark", "flood", "shock", "theft"];
  const highWords = ["serious", "important", "asap", "critical", "down", "outage", "broken", "not working"];
  const lowWords = ["minor", "small", "suggestion", "cosmetic"];

  let priority: "low" | "medium" | "high" | "urgent" = "medium";
  if (urgentWords.some((w) => lower.includes(w))) priority = "urgent";
  else if (highWords.some((w) => lower.includes(w))) priority = "high";
  else if (lowWords.some((w) => lower.includes(w))) priority = "low";

  return {
    suggestedCategory: bestCategory,
    priority,
    keywords: [...new Set(matchedKeywords)],
    recommendedDepartmentCode,
  };
}

export async function findSimilarComplaints(opts: {
  category: string;
  buildingId?: number | null;
  days: number;
}): Promise<number> {
  const cutoff = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints)
    .where(
      sql`${complaints.category} = ${opts.category}
      AND (${opts.buildingId ?? null}::int IS NULL OR ${complaints.buildingId} = ${opts.buildingId ?? null})
      AND ${complaints.createdAt} >= ${cutoff.toISOString()}::timestamptz`
    );
  return rows[0]?.count ?? 0;
}

export async function generateAdminReportSummary(): Promise<{
  summary: string;
  metrics: {
    totalComplaints: number;
    openComplaints: number;
    resolvedComplaints: number;
    topCategories: { category: string; count: number }[];
  };
}> {
  const [totalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(complaints);
  const [openRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints)
    .where(sql`${complaints.status} NOT IN ('resolved', 'closed', 'rejected')`);
  const [resolvedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints)
    .where(eq(complaints.status, "resolved"));

  const topCategories = await db
    .select({
      category: complaints.category,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .groupBy(complaints.category)
    .orderBy(desc(sql`count(*)`))
    .limit(4);

  const totalComplaints = totalRow?.count ?? 0;
  const openComplaints = openRow?.count ?? 0;
  const resolvedComplaints = resolvedRow?.count ?? 0;
  const rate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

  const topCatText =
    topCategories.length > 0
      ? topCategories.map((c) => `${c.category.replace("_", " ")} (${c.count})`).join(", ")
      : "none recorded";

  const summary = [
    `### Executive Campus Operations Summary`,
    `- **Total Recorded Complaints:** ${totalComplaints}`,
    `- **Active / Open Issues:** ${openComplaints}`,
    `- **Resolved Issues:** ${resolvedComplaints} (**${rate}%** resolution rate)`,
    `- **Most Frequent Categories:** ${topCatText}`,
    ``,
    `**Recommended Action:** Prioritize open high/urgent infrastructure tickets in top recurring categories and verify resolution feedback with students.`,
  ].join("\n");

  return {
    summary,
    metrics: {
      totalComplaints,
      openComplaints,
      resolvedComplaints,
      topCategories,
    },
  };
}

export async function testOpenRouterConnection(opts?: {
  apiKey?: string | null;
  model?: string | null;
}): Promise<{
  ok: boolean;
  model: string;
  reply?: string;
  reasoningTokens?: number | null;
  streamed?: boolean;
  error?: string;
}> {
  const overrides = await loadRuntimeGoogleOverrides();
  const resolved = resolveOpenRouterApiKeySync(overrides);
  const apiKey = (opts?.apiKey && opts.apiKey.trim()) || resolved.key;
  const model = resolveOpenRouterModelId(opts?.model || overrides.dbModel);

  if (!apiKey) {
    return {
      ok: false,
      model,
      error:
        "No OPENROUTER_API_KEY configured yet. Paste your OpenRouter key (sk-or-v1-...) in .env or in Super Admin -> System Configuration.",
    };
  }

  try {
    const res = await executeOpenRouterChat({
      apiKey,
      model,
      userText: "Reply in one short sentence confirming AIR CAMPUS X OpenRouter SDK connection is online.",
      temperature: 0.1,
      maxTokens: 120,
    });
    return {
      ok: true,
      model: res.model,
      reply: res.text,
      reasoningTokens: res.reasoningTokens,
      streamed: res.streamed,
    };
  } catch (e) {
    return {
      ok: false,
      model,
      error: e instanceof Error ? e.message : "OpenRouter SDK connection error",
    };
  }
}

export async function testGoogleGeminiConnection(opts?: {
  apiKey?: string | null;
  model?: string | null;
}): Promise<{ ok: boolean; model: string; reply?: string; error?: string }> {
  const overrides = await loadRuntimeGoogleOverrides();
  const resolved = resolveGoogleApiKeySync(overrides);
  const apiKey = (opts?.apiKey && opts.apiKey.trim()) || resolved.key;
  const model =
    (opts?.model && opts.model.trim()) ||
    (overrides.dbModel && !overrides.dbModel.includes("/") ? overrides.dbModel : null) ||
    process.env.GOOGLE_GEMINI_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  if (!apiKey) {
    return {
      ok: false,
      model,
      error:
        "No Google API key string found yet. Paste your GOOGLE_API_KEY in .env (or in Super Admin -> System Configuration) to connect live Google Gemini.",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with one short sentence confirming AIR CAMPUS X Google Gemini connection is online." }],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 60 },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message || `HTTP ${res.status}`;
      return { ok: false, model, error: `Google Gemini API error: ${msg}` };
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || "Connected to Google Gemini API.";

    return { ok: true, model, reply };
  } catch (e) {
    return {
      ok: false,
      model,
      error: e instanceof Error ? e.message : "Network error connecting to Google Gemini API",
    };
  }
}
