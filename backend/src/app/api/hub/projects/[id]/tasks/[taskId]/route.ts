import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { error, session } = await requirePermission("projecthub.edit");
  if (error) return error;

  const { id, taskId } = await params;
  const projectId = parseInt(id);
  const tId = parseInt(taskId);
  const body = await request.json();

  const before = await prisma.hubTask.findUnique({ where: { id: tId } });
  if (!before) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.phase !== undefined) data.phase = body.phase;
  if (body.status !== undefined) data.status = body.status;
  if (body.responsible !== undefined) data.responsible = body.responsible;
  if (body.accountable !== undefined) data.accountable = body.accountable;
  if (body.informed !== undefined) data.informed = body.informed;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const task = await prisma.hubTask.update({
    where: { id: tId },
    data,
    include: { subtasks: true },
  });

  await prisma.hubProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } });

  if (body.status && body.status !== before.status) {
    const project = await prisma.hubProject.findUnique({ where: { id: projectId } });
    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: `task → ${body.status}`,
        target: project?.name ?? "Project",
        detail: task.title,
        type: "project-hub",
        hubProjectId: projectId,
      },
    });
  }

  return NextResponse.json(task);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { error } = await requirePermission("projecthub.edit");
  if (error) return error;
  const { id, taskId } = await params;
  await prisma.hubTask.delete({ where: { id: parseInt(taskId) } });
  await prisma.hubProject.update({ where: { id: parseInt(id) }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
