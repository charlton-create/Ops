import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { deleteFile, getPresignedDownloadUrl } from "@/lib/storage/s3";
import { NextRequest, NextResponse } from "next/server";

const MEETING_INCLUDE = {
  host: { select: { id: true, name: true, color: true } },
  actionItems: { orderBy: { sortOrder: "asc" as const } },
  followUps: { orderBy: { sortOrder: "asc" as const } },
  files: { orderBy: { uploadedAt: "asc" as const } },
};

async function withFileUrls(meeting: any) {
  if (!meeting.files) return meeting;
  const files = await Promise.all(
    meeting.files.map(async (f: any) => {
      if (f.kind === "embedded" && f.s3Key) {
        try {
          return { ...f, downloadUrl: await getPresignedDownloadUrl(f.s3Key) };
        } catch {
          return { ...f, downloadUrl: null };
        }
      }
      return f;
    }),
  );
  return { ...meeting, files };
}

function mapMeeting(m: any) {
  return {
    ...m,
    hostName: m.host?.name ?? null,
    hostColor: m.host?.color ?? null,
    snippet: (m.summary || m.discussion || m.transcript || "").slice(0, 200),
    attendeeCount: (m.attendees || []).length,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("meetings.view");
  if (error) return error;

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id: parseInt(id) },
    include: MEETING_INCLUDE,
  });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  const withUrls = await withFileUrls(meeting);
  return NextResponse.json(mapMeeting(withUrls));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("meetings.edit");
  if (error) return error;

  const { id } = await params;
  const meetingId = parseInt(id);
  const body = await request.json();

  const before = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!before) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : null;
  if (body.status !== undefined) data.status = body.status;
  if (body.summary !== undefined) data.summary = body.summary;
  if (body.discussion !== undefined) data.discussion = body.discussion;
  if (body.transcript !== undefined) data.transcript = body.transcript;
  if (body.attendees !== undefined) data.attendees = body.attendees;
  if (body.attendeeIds !== undefined) data.attendeeIds = body.attendeeIds;
  if (body.agenda !== undefined) data.agenda = body.agenda;
  if (body.hostId !== undefined) {
    data.hostId = body.hostId === null || body.hostId === "" ? null : parseInt(body.hostId);
  }

  const meeting = await prisma.meeting.update({
    where: { id: meetingId },
    data,
    include: MEETING_INCLUDE,
  });

  if (body.status && body.status !== before.status) {
    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: `meeting → ${body.status}`,
        target: meeting.title,
        type: "meeting",
      },
    });
  }

  const withUrls = await withFileUrls(meeting);
  return NextResponse.json(mapMeeting(withUrls));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("meetings.delete");
  if (error) return error;

  const { id } = await params;
  const meetingId = parseInt(id);
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { files: true },
  });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  // Best-effort S3 cleanup
  for (const f of meeting.files) {
    if (f.kind === "embedded" && f.s3Key) {
      try { await deleteFile(f.s3Key); } catch (err) { console.warn("S3 delete failed:", err); }
    }
  }

  await prisma.meeting.delete({ where: { id: meetingId } });
  await prisma.activity.create({
    data: {
      who: session?.user.name || "System",
      action: "deleted meeting",
      target: meeting.title,
      type: "meeting",
    },
  });
  return NextResponse.json({ ok: true });
}
