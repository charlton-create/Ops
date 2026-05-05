import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string; subId: string }> }) {
  const { error } = await requirePermission("projecthub.edit");
  if (error) return error;

  const { id, subId } = await params;
  const body = await request.json();

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.assignee !== undefined) data.assignee = body.assignee;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.status !== undefined) data.status = body.status;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const sub = await prisma.hubSubtask.update({ where: { id: parseInt(subId) }, data });
  await prisma.hubProject.update({ where: { id: parseInt(id) }, data: { updatedAt: new Date() } });
  return NextResponse.json(sub);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string; subId: string }> }) {
  const { error } = await requirePermission("projecthub.edit");
  if (error) return error;
  const { id, subId } = await params;
  await prisma.hubSubtask.delete({ where: { id: parseInt(subId) } });
  await prisma.hubProject.update({ where: { id: parseInt(id) }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
