import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { summarizeMeeting } from "@/lib/meetings/ai";
import { NextRequest, NextResponse } from "next/server";

const INCLUDE = {
  host: { select: { id: true, name: true, color: true } },
  actionItems: { orderBy: { sortOrder: "asc" as const } },
  followUps: { orderBy: { sortOrder: "asc" as const } },
  files: { orderBy: { uploadedAt: "asc" as const } },
};

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission("meetings.edit");
  if (error) return error;

  try {
    const body = await request.json();
    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

    const date = body.date ? new Date(body.date) : new Date();
    const attendees: string[] = Array.isArray(body.attendees) ? body.attendees.filter(Boolean) : [];
    const attendeeIds: number[] = Array.isArray(body.attendeeIds)
      ? body.attendeeIds.map((n: any) => parseInt(n)).filter((n: number) => !isNaN(n))
      : [];
    const agenda: string[] = Array.isArray(body.agenda) ? body.agenda.filter(Boolean) : [];

    let aiResult: any = null;
    let aiError: string | null = null;
    if (body.useAi !== false) {
      try {
        const ai = await summarizeMeeting(
          { title, date, attendees, agenda },
          content,
          "import",
        );
        if ("unavailable" in ai) {
          aiError = ai.reason;
        } else {
          aiResult = ai;
        }
      } catch (err: any) {
        aiError = err.message;
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        date,
        status: "completed",
        attendees,
        attendeeIds,
        agenda,
        hostId: body.hostId ? parseInt(body.hostId) : (session?.user.teamMemberId ?? null),
        imported: true,
        transcript: content,
        discussion: aiResult?.discussion ?? content,
        summary: aiResult?.summary ?? (aiError
          ? `Imported (AI structuring unavailable: ${aiError})`
          : ""),
        actionItems: aiResult?.actionItems
          ? {
              create: aiResult.actionItems.map((a: any, i: number) => ({
                task: a.task ?? "",
                owner: a.owner || null,
                dueDate: a.dueDate || null,
                sortOrder: i,
              })),
            }
          : undefined,
        followUps: aiResult?.followUpTasks
          ? {
              create: aiResult.followUpTasks.map((f: any, i: number) => ({
                task: f.task ?? "",
                context: f.context || null,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: INCLUDE,
    });

    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: "imported meeting",
        target: meeting.title,
        detail: aiResult ? "AI-structured" : "raw notes",
        type: "meeting",
      },
    });

    return NextResponse.json({ ...meeting, aiUsed: !!aiResult, aiError }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/meetings/import error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
