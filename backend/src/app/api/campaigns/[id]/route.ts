import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const campaign = await prisma.emailCampaign.update({
    where: { id: parseInt(id) },
    data: body,
  });
  return NextResponse.json(campaign);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  const { id } = await params;
  await prisma.emailCampaign.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
