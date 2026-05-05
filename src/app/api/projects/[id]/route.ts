import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("projects.edit");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const project = await prisma.project.update({
    where: { id: parseInt(id) },
    data: body,
    include: { owner: true, tasks: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(project);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("projects.delete");
  if (error) return error;

  const { id } = await params;
  await prisma.project.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
