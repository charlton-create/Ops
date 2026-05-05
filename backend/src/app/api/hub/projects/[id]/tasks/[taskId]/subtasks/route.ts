import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { error } = await requirePermission("projecthub.edit");
  if (error) return error;

  const { id, taskId } = await params;
  const tId = parseInt(taskId);
  const body = await request.json();

  const title = (body.title ?? "").trim();
  const assignee = (body.assignee ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!assignee) return NextResponse.json({ error: "Assignee required" }, { status: 400 });

  const last = await prisma.hubSubtask.findFirst({ where: { taskId: tId }, orderBy: { sortOrder: "desc" } });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const sub = await prisma.hubSubtask.create({
    data: {
      taskId: tId,
      title,
      assignee,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: body.status ?? "todo",
      sortOrder,
    },
  });

  await prisma.hubProject.update({ where: { id: parseInt(id) }, data: { updatedAt: new Date() } });
  return NextResponse.json(sub, { status: 201 });
}
