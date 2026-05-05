import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { uploadFile, getPresignedDownloadUrl } from "@/lib/storage/s3";
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

// GET — list attachments with presigned download URLs
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("leads.view");
  if (error) return error;

  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: parseInt(id) } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const attachments = (lead.attachments as unknown as LeadAttachment[]) || [];

  // Generate presigned URLs for each attachment
  const withUrls = await Promise.all(
    attachments.map(async (att) => ({
      ...att,
      downloadUrl: att.s3Key ? await getPresignedDownloadUrl(att.s3Key) : null,
    }))
  );

  return NextResponse.json(withUrls);
}

// POST — upload file to S3 and save metadata
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("leads.edit");
  if (error) return error;

  const { id } = await params;
  const leadId = parseInt(id);

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Read file bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate S3 key
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `leads/${leadId}/${timestamp}-${safeName}`;

    // Upload to S3
    await uploadFile(s3Key, buffer, file.type);

    // Save metadata in lead's attachments JSON
    const existingAttachments = (lead.attachments as unknown as LeadAttachment[]) || [];
    const nextId = existingAttachments.length > 0
      ? Math.max(...existingAttachments.map((a) => a.id)) + 1
      : 1;

    const newAttachment: LeadAttachment = {
      id: nextId,
      name: file.name,
      size: file.size,
      type: file.type,
      s3Key,
      addedAt: new Date().toISOString(),
      addedBy: session!.user.name,
    };

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        attachments: [...existingAttachments, newAttachment] as any,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        who: session!.user.name,
        action: "attached file",
        target: lead.company,
        detail: file.name,
        type: "general",
        leadId,
      },
    });

    // Return attachment with download URL
    const downloadUrl = await getPresignedDownloadUrl(s3Key);

    return NextResponse.json({ ...newAttachment, downloadUrl }, { status: 201 });
  } catch (err: any) {
    console.error("Attachment upload error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
