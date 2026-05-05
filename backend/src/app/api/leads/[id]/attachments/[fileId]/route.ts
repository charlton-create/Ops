import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { deleteFile } from "@/lib/storage/s3";
import { NextRequest, NextResponse } from "next/server";

interface LeadAttachment {
  id: number;
  name: string;
  size: number;
  type: string;
  s3Key: string;
  addedAt: string;
  addedBy: string;
}

// DELETE — remove attachment from S3 and lead metadata
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { error, session } = await requirePermission("leads.edit");
  if (error) return error;

  const { id, fileId } = await params;
  const leadId = parseInt(id);
  const attachmentId = parseInt(fileId);

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const attachments = (lead.attachments as unknown as LeadAttachment[]) || [];
  const attachment = attachments.find((a) => a.id === attachmentId);

  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  // Delete from S3
  if (attachment.s3Key) {
    await deleteFile(attachment.s3Key);
  }

  // Remove from lead metadata
  const updated = attachments.filter((a) => a.id !== attachmentId);
  await prisma.lead.update({
    where: { id: leadId },
    data: { attachments: updated as any },
  });

  await prisma.activity.create({
    data: {
      who: session!.user.name,
      action: "removed attachment",
      target: lead.company,
      detail: attachment.name,
      type: "general",
      leadId,
    },
  });

  return NextResponse.json({ ok: true });
}
