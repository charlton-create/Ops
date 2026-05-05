import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("leads.edit");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const lead = await prisma.lead.update({
    where: { id: parseInt(id) },
    data: body,
    include: { owner: true },
  });
  return NextResponse.json(lead);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("leads.delete");
  if (error) return error;

  const { id } = await params;
  await prisma.lead.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
