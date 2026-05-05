import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { uploadFile, getPresignedDownloadUrl } from "@/lib/storage/s3";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 4 * 1024 * 1024;

function s3Configured(): boolean {
  return !!(process.env.S3_ATTACHMENTS_BUCKET || process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);
}

// POST — handles BOTH multipart upload (embedded) and JSON body (linked)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("meetings.edit");
  if (error) return error;

  const { id } = await params;
  const meetingId = parseInt(id);
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const ctype = request.headers.get("content-type") || "";

  // ---- Linked file (JSON body) ----
  if (ctype.includes("application/json")) {
    const body = await request.json();
    const name = (body.name ?? "").trim();
    const url = (body.url ?? "").trim();
    if (!name || !url) return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });

    const created = await prisma.meetingFile.create({
      data: {
        meetingId,
        name,
        kind: "linked",
        url,
        uploadedBy: session?.user.name ?? null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  }

  // ---- Embedded upload (multipart) ----
  if (!s3Configured()) {
    return NextResponse.json(
      { error: "File uploads are not configured on this server. Use the Link External option instead.", needsLinked: true },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB cap. Use the Link External option instead.`, needsLinked: true },
        { status: 413 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `meetings/${meetingId}/${Date.now()}-${safeName}`;
    await uploadFile(s3Key, buffer, file.type);

    const created = await prisma.meetingFile.create({
      data: {
        meetingId,
        name: file.name,
        kind: "embedded",
        s3Key,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: session?.user.name ?? null,
      },
    });

    let downloadUrl: string | null = null;
    try { downloadUrl = await getPresignedDownloadUrl(s3Key); } catch { /* ignore */ }
    return NextResponse.json({ ...created, downloadUrl }, { status: 201 });
  } catch (err: any) {
    console.error("Meeting file upload error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
