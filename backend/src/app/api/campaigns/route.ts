import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const campaigns = await prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  try {
    const body = await request.json();

    const campaign = await prisma.emailCampaign.create({
      data: {
        name: body.name ?? "",
        fromName: body.fromName,
        fromEmail: body.fromEmail,
        subject: body.subject,
        contentPieceId: body.contentPieceId ?? null,
        status: body.status ?? "Draft",
        audience: body.audience ?? null,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        recipients: body.recipients ?? 0,
        bodyHtml: body.bodyHtml ?? "",
        imageFileName: body.imageFileName,
        imageDataUrl: body.imageDataUrl,
        createdBy: body.createdBy,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/campaigns error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
