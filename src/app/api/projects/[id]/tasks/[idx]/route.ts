import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const { error } = await requirePermission("projects.edit");
  if (error) return error;

  const { id, idx } = await params;
  const { done } = await request.json();
  const projectId = parseInt(id);

  const tasks = await prisma.projectTask.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });

  const task = tasks[parseInt(idx)];
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.projectTask.update({ where: { id: task.id }, data: { done } });

  const updatedTasks = await prisma.projectTask.findMany({ where: { projectId } });
  const progress = Math.round((updatedTasks.filter((t) => t.done).length / updatedTasks.length) * 100);
  await prisma.project.update({ where: { id: projectId }, data: { progress } });

  return NextResponse.json({ ok: true, progress });
}
