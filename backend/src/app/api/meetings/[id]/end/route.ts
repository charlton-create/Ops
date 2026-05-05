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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("meetings.edit");
  if (error) return error;

  const { id } = await params;
  const meetingId = parseInt(id);
  const body = await request.json().catch(() => ({}));

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { actionItems: true, followUps: true },
  });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  // Allow caller to pass a final transcript/discussion update
  const finalTranscript = typeof body.transcript === "string" ? body.transcript : meeting.transcript ?? "";
  const finalDiscussion = typeof body.discussion === "string" ? body.discussion : meeting.discussion ?? "";

  let aiResult: any = null;
  let aiError: string | null = null;
  if (body.skipAi !== true) {
    try {
      const ai = await summarizeMeeting(
        {
          title: meeting.title,
          date: meeting.date,
          attendees: meeting.attendees,
          agenda: meeting.agenda,
        },
        finalTranscript,
        "live",
      );
      if ("unavailable" in ai) {
        aiError = ai.reason;
      } else {
        aiResult = ai;
      }
    } catch (err: any) {
      console.error("Meeting AI summary failed:", err.message);
      aiError = err.message;
    }
  }

  // Update meeting + replace actionItems/followUps if AI returned them
  await prisma.meetingActionItem.deleteMany({ where: { meetingId } });
  await prisma.meetingFollowUp.deleteMany({ where: { meetingId } });

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: "completed",
      transcript: finalTranscript,
      discussion: aiResult?.discussion ?? finalDiscussion,
      summary: aiResult?.summary ?? (aiError
        ? `AI summary unavailable: ${aiError}. Raw transcript saved.`
        : meeting.summary),
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
      action: "ended meeting",
      target: updated.title,
      detail: aiResult ? "AI summary generated" : "raw transcript only",
      type: "meeting",
    },
  });

  return NextResponse.json({
    ...updated,
    hostName: (updated as any).host?.name ?? null,
    aiUsed: !!aiResult,
    aiError,
  });
}
