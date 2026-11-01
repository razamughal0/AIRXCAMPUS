import { getSession } from "@/lib/auth";
import { aiChat, type ChatHistoryTurn, type MultimodalMediaInput } from "@/lib/ai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Session expired or not authenticated. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { query, module, model, media, history } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }
    if (query.length > 3000) {
      return NextResponse.json({ error: "Question is too long (max 3000 characters)." }, { status: 400 });
    }

    const safeHistory: ChatHistoryTurn[] = Array.isArray(history)
      ? history
          .filter(
            (h: unknown): h is ChatHistoryTurn =>
              Boolean(
                h &&
                  typeof h === "object" &&
                  ((h as ChatHistoryTurn).role === "user" ||
                    (h as ChatHistoryTurn).role === "assistant") &&
                  typeof (h as ChatHistoryTurn).content === "string"
              )
          )
          .slice(-6)
      : [];

    let safeMedia: MultimodalMediaInput | undefined;
    if (media && typeof media === "object") {
      safeMedia = {
        imageUrl: typeof media.imageUrl === "string" ? media.imageUrl.trim() : null,
        videoUrl: typeof media.videoUrl === "string" ? media.videoUrl.trim() : null,
        inputAudio:
          media.inputAudio &&
          typeof media.inputAudio === "object" &&
          typeof media.inputAudio.data === "string"
            ? {
                data: media.inputAudio.data.trim(),
                format:
                  typeof media.inputAudio.format === "string"
                    ? media.inputAudio.format.trim()
                    : "wav",
              }
            : null,
      };
    }

    const effectiveModule =
      typeof module === "string" && module.trim()
        ? module.trim()
        : session.role === "faculty"
        ? "teaching_assistant"
        : "assistant";

    const result = await aiChat({
      query: query.trim(),
      userId: session.userId,
      role: session.role,
      module: effectiveModule,
      model: typeof model === "string" && model.trim() ? model.trim() : null,
      media: safeMedia,
      history: safeHistory,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (e) {
    console.error("AI chat error:", e);
    return NextResponse.json(
      { error: "AI service encountered an unexpected error. Please try again." },
      { status: 500 }
    );
  }
}
