import { db } from "@/db";
import { complaints, buildings, notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { classifyComplaint } from "@/lib/ai";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function generateTrackingId() {
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `AUK-${n}`;
}

export async function POST(req: Request) {
  try {
    const { ensureDatabaseReady } = await import("@/db/bootstrap");
    await ensureDatabaseReady();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role !== "student" && session.role !== "faculty") {
      return NextResponse.json({ error: "Only students/faculty can submit complaints" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, category, buildingId, locationId, roomDescription } = body;

    if (!title || !description || !category) {
      return NextResponse.json({ error: "Title, description and category are required" }, { status: 400 });
    }
    if (title.length > 200) return NextResponse.json({ error: "Title too long" }, { status: 400 });
    if (description.length > 2000) return NextResponse.json({ error: "Description too long" }, { status: 400 });

    const aiClass = classifyComplaint(`${title} ${description}`);

    let trackingId = generateTrackingId();

    const [created] = await db
      .insert(complaints)
      .values({
        trackingId,
        submitterUserId: session.userId,
        category,
        title: title.trim(),
        description: description.trim(),
        buildingId: buildingId || null,
        locationId: locationId || null,
        roomDescription: roomDescription || null,
        priority: aiClass.priority,
        status: "submitted",
        aiClassification: aiClass,
      })
      .returning();

    await db.insert(notifications).values({
      userId: session.userId,
      type: "complaint",
      title: "Complaint Submitted",
      message: `Your complaint "${title}" has been received. Tracking ID: ${trackingId}`,
      link: `/${session.role === "student" ? "student" : "faculty"}/complaints/${created.id}`,
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      trackingId: created.trackingId,
      aiClassification: aiClass,
    });
  } catch (e) {
    console.error("Create complaint error:", e);
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}

export async function GET() {
  const { ensureDatabaseReady } = await import("@/db/bootstrap");
  await ensureDatabaseReady();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let rows;
  if (session.role === "student" || session.role === "faculty") {
    rows = await db
      .select({ complaint: complaints, building: buildings })
      .from(complaints)
      .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
      .where(eq(complaints.submitterUserId, session.userId))
      .orderBy(desc(complaints.createdAt));
  } else {
    rows = await db
      .select({ complaint: complaints, building: buildings })
      .from(complaints)
      .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
      .orderBy(desc(complaints.createdAt))
      .limit(500);
  }

  return NextResponse.json({ complaints: rows });
}
