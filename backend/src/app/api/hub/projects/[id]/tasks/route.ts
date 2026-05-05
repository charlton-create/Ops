import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("projecthub.edit");
  if (error) return error;

  const { id } = await params;
  const projectId = parseInt(id);
  const body = await request.json();

  const title = (body.title ?? "").trim();
  const responsible = (body.responsible ?? "").trim();
  const accountable = (body.accountable ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!responsible || !accountable) return NextResponse.json({ error: "Responsible and Accountable are required" }, { status: 400 });

  const lastTask = await prisma.hubTask.findFirst({
    where: { projectId, phase: body.phase ?? "M" },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (lastTask?.sortOrder ?? -1) + 1;

  const task = await prisma.hubTask.create({
    data: {
      projectId,
      title,
      description: body.description ?? null,
      phase: body.phase ?? "M",
      status: body.status ?? "todo",
      responsible,
      accountable,
      informed: body.informed ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      sortOrder,
    },
    include: { subtasks: true },
  });

  const project = await prisma.hubProject.findUnique({ where: { id: projectId } });
  await prisma.hubProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  await prisma.activity.create({
    data: {
      who: session?.user.name || "System",
      action: "added task",
      target: project?.name ?? "Project",
      detail: title,
      type: "project-hub",
      hubProjectId: projectId,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
