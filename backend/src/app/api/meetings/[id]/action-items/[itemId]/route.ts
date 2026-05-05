import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { error } = await requirePermission("meetings.edit");
  if (error) return error;

  const { itemId } = await params;
  const body = await request.json();
  const data: any = {};
  if (body.task !== undefined) data.task = body.task;
  if (body.owner !== undefined) data.owner = body.owner;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate;
  if (body.done !== undefined) data.done = !!body.done;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const item = await prisma.meetingActionItem.update({
    where: { id: parseInt(itemId) },
    data,
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { error } = await requirePermission("meetings.edit");
  if (error) return error;
  const { itemId } = await params;
  await prisma.meetingActionItem.delete({ where: { id: parseInt(itemId) } });
  return NextResponse.json({ ok: true });
}
