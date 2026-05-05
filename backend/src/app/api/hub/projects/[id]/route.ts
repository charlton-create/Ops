import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const HUB_INCLUDE = {
  owner: { select: { id: true, name: true, color: true } },
  tasks: {
    orderBy: [{ phase: "asc" as const }, { sortOrder: "asc" as const }],
    include: { subtasks: { orderBy: { sortOrder: "asc" as const } } },
  },
};

function mapProject(p: any) {
  const taskCount = p.tasks?.length ?? 0;
  const doneCount = p.tasks?.filter((t: any) => t.status === "done").length ?? 0;
  return {
    ...p,
    ownerName: p.owner?.name ?? p.ownerLabel ?? null,
    ownerColor: p.owner?.color ?? null,
    progress: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("projecthub.view");
  if (error) return error;

  const { id } = await params;
  const project = await prisma.hubProject.findUnique({
    where: { id: parseInt(id) },
    include: HUB_INCLUDE,
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(mapProject(project));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("projecthub.edit");
  if (error) return error;

  const { id } = await params;
  const projectId = parseInt(id);
  const body = await request.json();

  const before = await prisma.hubProject.findUnique({ where: { id: projectId } });
  if (!before) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.type !== undefined) data.type = body.type;
  if (body.status !== undefined) data.status = body.status;
  if (body.currentPhase !== undefined) data.currentPhase = body.currentPhase;
  if (body.ownerLabel !== undefined) data.ownerLabel = body.ownerLabel;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.targetDate !== undefined) data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.ownerId !== undefined) {
    data.ownerId = body.ownerId === null || body.ownerId === "" ? null : parseInt(body.ownerId);
  }

  const project = await prisma.hubProject.update({
    where: { id: projectId },
    data,
    include: HUB_INCLUDE,
  });

  if (body.status && body.status !== before.status) {
    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: `project → ${body.status}`,
        target: project.name,
        type: "project-hub",
        hubProjectId: project.id,
      },
    });
  } else if (body.currentPhase && body.currentPhase !== before.currentPhase) {
    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: `phase → ${body.currentPhase}`,
        target: project.name,
        type: "project-hub",
        hubProjectId: project.id,
      },
    });
  }

  return NextResponse.json(mapProject(project));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("projecthub.delete");
  if (error) return error;

  const { id } = await params;
  const projectId = parseInt(id);
  const project = await prisma.hubProject.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await prisma.hubProject.delete({ where: { id: projectId } });
  await prisma.activity.create({
    data: {
      who: session?.user.name || "System",
      action: "deleted project",
      target: project.name,
      type: "project-hub",
    },
  });
  return NextResponse.json({ ok: true });
}
