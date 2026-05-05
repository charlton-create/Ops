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

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("meetings.edit");
  if (error) return error;

  const { id } = await params;
  const meetingId = parseInt(id);

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const transcript = meeting.transcript || meeting.discussion || "";
  if (!transcript.trim()) {
    return NextResponse.json({ error: "No transcript or discussion to summarize" }, { status: 400 });
  }

  const ai = await summarizeMeeting(
    {
      title: meeting.title,
      date: meeting.date,
      attendees: meeting.attendees,
      agenda: meeting.agenda,
    },
    transcript,
    meeting.imported ? "import" : "live",
  );

  if ("unavailable" in ai) {
    return NextResponse.json({ error: ai.reason }, { status: 503 });
  }

  await prisma.meetingActionItem.deleteMany({ where: { meetingId } });
  await prisma.meetingFollowUp.deleteMany({ where: { meetingId } });

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      summary: ai.summary,
      discussion: ai.discussion,
      actionItems: {
        create: ai.actionItems.map((a, i) => ({
          task: a.task,
          owner: a.owner || null,
          dueDate: a.dueDate || null,
          sortOrder: i,
        })),
      },
      followUps: {
        create: ai.followUpTasks.map((f, i) => ({
          task: f.task,
          context: f.context || null,
          sortOrder: i,
        })),
      },
    },
    include: INCLUDE,
  });

  await prisma.activity.create({
    data: {
      who: session?.user.name || "System",
      action: "regenerated meeting summary",
      target: updated.title,
      type: "meeting",
    },
  });

  return NextResponse.json(updated);
}
