import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeDocuments, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const docs = await db
    .select()
    .from(knowledgeDocuments)
    .orderBy(desc(knowledgeDocuments.createdAt));

  return NextResponse.json({ documents: docs });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, category, content, source } = body;

  if (!title || !category || !content) {
    return NextResponse.json(
      { error: "Title, category, and content are required." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(knowledgeDocuments)
    .values({
      title: String(title).trim(),
      category: String(category).trim(),
      content: String(content).trim(),
      source: source ? String(source).trim() : null,
      uploadedByUserId: session.userId,
      isActive: true,
    })
    .returning();

  await db
    .insert(auditLogs)
    .values({
      userId: session.userId,
      action: "knowledge.create",
      entityType: "knowledge_document",
      entityId: created.id,
      metadata: { title: created.title, category: created.category },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, document: created });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, isActive } = body;
  if (typeof id !== "number" || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Valid id and isActive required" }, { status: 400 });
  }

  const [updated] = await db
    .update(knowledgeDocuments)
    .set({ isActive })
    .where(eq(knowledgeDocuments.id, id))
    .returning();

  return NextResponse.json({ ok: true, document: updated });
}
