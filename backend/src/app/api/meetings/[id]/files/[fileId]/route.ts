import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { deleteFile } from "@/lib/storage/s3";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { error } = await requirePermission("meetings.edit");
  if (error) return error;

  const { fileId } = await params;
  const fId = parseInt(fileId);
  const file = await prisma.meetingFile.findUnique({ where: { id: fId } });
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (file.kind === "embedded" && file.s3Key) {
    try { await deleteFile(file.s3Key); } catch (err) { console.warn("S3 delete failed:", err); }
  }
  await prisma.meetingFile.delete({ where: { id: fId } });
  return NextResponse.json({ ok: true });
}
