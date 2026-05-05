import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("meetings.edit");
  if (error) return error;

  const { id } = await params;
  const meetingId = parseInt(id);
  const body = await request.json();
  const task = (body.task ?? "").trim();
  if (!task) return NextResponse.json({ error: "Task is required" }, { status: 400 });

  const last = await prisma.meetingActionItem.findFirst({
    where: { meetingId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const item = await prisma.meetingActionItem.create({
    data: {
      meetingId,
      task,
      owner: body.owner || null,
      dueDate: body.dueDate || null,
      sortOrder,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
