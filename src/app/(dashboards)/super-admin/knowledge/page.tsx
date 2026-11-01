import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { getAIProviderStatusAsync } from "@/lib/ai";
import { desc } from "drizzle-orm";
import { KnowledgeClient } from "./knowledge-client";

export const dynamic = "force-dynamic";

export default async function SuperAdminKnowledgePage() {
  await requirePageRole("super_admin");

  const docs = await db
    .select()
    .from(knowledgeDocuments)
    .orderBy(desc(knowledgeDocuments.createdAt));

  const aiStatus = await getAIProviderStatusAsync();

  return (
    <DashboardShell role="super_admin" title="Knowledge Base">
      <KnowledgeClient initialDocs={docs} aiStatus={aiStatus} />
    </DashboardShell>
  );
}
