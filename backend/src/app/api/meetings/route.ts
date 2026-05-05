import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const MEETING_INCLUDE = {
  host: { select: { id: true, name: true, color: true } },
  actionItems: { orderBy: { sortOrder: "asc" as const } },
  followUps: { orderBy: { sortOrder: "asc" as const } },
  files: { orderBy: { uploadedAt: "asc" as const } },
};

function mapMeeting(m: any) {
  return {
    ...m,
    hostName: m.host?.name ?? null,
    hostColor: m.host?.color ?? null,
    snippet: (m.summary || m.discussion || m.transcript || "").slice(0, 200),
    attendeeCount: (m.attendees || []).length,
  };
}

export async function GET(request: NextRequest) {
  const { error } = await requirePermission("meetings.view");
  if (error) return error;

  const status = request.nextUrl.searchParams.get("status");
  const where = status && status !== "all" ? { status } : {};
  const meetings = await prisma.meeting.findMany({
    where,
    include: MEETING_INCLUDE,
    orderBy: { date: "desc" },
  });
  return NextResponse.json(meetings.map(mapMeeting));
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission("meetings.edit");
  if (error) return error;

  try {
    const body = await request.json();
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const attendees: string[] = Array.isArray(body.attendees) ? body.attendees.filter(Boolean) : [];
    const attendeeIds: number[] = Array.isArray(body.attendeeIds)
      ? body.attendeeIds.map((n: any) => parseInt(n)).filter((n: number) => !isNaN(n))
      : [];
    const agenda: string[] = Array.isArray(body.agenda) ? body.agenda.filter(Boolean) : [];

    let hostId: number | null = null;
    if (body.hostId) {
      hostId = parseInt(body.hostId);
    } else if (session?.user.teamMemberId) {
      hostId = session.user.teamMemberId;
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        date: body.date ? new Date(body.date) : new Date(),
        status: body.status || "live",
        attendees,
        attendeeIds,
        agenda,
        hostId,
        imported: !!body.imported,
        summary: body.summary ?? null,
        discussion: body.discussion ?? null,
        transcript: body.transcript ?? null,
      },
      include: MEETING_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: meeting.imported ? "imported meeting" : "started meeting",
        target: meeting.title,
        type: "meeting",
      },
    });

    return NextResponse.json(mapMeeting(meeting), { status: 201 });
  } catch (err: any) {
    console.error("POST /api/meetings error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
