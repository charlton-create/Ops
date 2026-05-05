import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("kb.edit");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const doc = await prisma.kBDocument.update({ where: { id: parseInt(id) }, data: body });
  return NextResponse.json(doc);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("kb.delete");
  if (error) return error;

  const { id } = await params;
  await prisma.kBDocument.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
