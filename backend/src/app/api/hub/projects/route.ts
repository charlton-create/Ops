import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const HUB_INCLUDE = {
  owner: { select: { id: true, name: true, color: true } },
  tasks: {
    orderBy: [{ phase: "asc" as const }, { sortOrder: "asc" as const }],
    include: {
      subtasks: { orderBy: { sortOrder: "asc" as const } },
    },
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

export async function GET(_request: NextRequest) {
  const { error } = await requirePermission("projecthub.view");
  if (error) return error;

  const projects = await prisma.hubProject.findMany({
    include: HUB_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects.map(mapProject));
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission("projecthub.edit");
  if (error) return error;

  try {
    const body = await request.json();
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    let ownerId: number | null = null;
    if (body.ownerId) {
      ownerId = parseInt(body.ownerId);
    } else if (body.ownerName) {
      const member = await prisma.teamMember.findFirst({ where: { name: body.ownerName } });
      ownerId = member?.id ?? null;
    }

    const project = await prisma.hubProject.create({
      data: {
        name,
        description: body.description ?? null,
        type: body.type ?? "general",
        status: body.status ?? "planning",
        currentPhase: body.currentPhase ?? "M",
        ownerId,
        ownerLabel: body.ownerLabel ?? (ownerId ? null : (body.ownerName ?? null)),
        startDate: body.startDate ? new Date(body.startDate) : null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
      },
      include: HUB_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: "created project",
        target: project.name,
        type: "project-hub",
        hubProjectId: project.id,
      },
    });

    return NextResponse.json(mapProject(project), { status: 201 });
  } catch (err: any) {
    console.error("POST /api/hub/projects error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
