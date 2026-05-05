import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const projects = await prisma.project.findMany({
    include: { owner: true, tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("projects.edit");
  if (error) return error;

  const body = await request.json();
  const { owner, tasks, ...data } = body;

  const ownerMember = await prisma.teamMember.findFirst({ where: { name: owner } });
  if (!ownerMember) return NextResponse.json({ error: "Owner not found" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      ...data,
      ownerId: ownerMember.id,
      tasks: tasks ? { create: tasks.map((t: any, i: number) => ({ text: t.text, done: t.done ?? false, sortOrder: i })) } : undefined,
    },
    include: { owner: true, tasks: { orderBy: { sortOrder: "asc" } } },
  });

  await prisma.activity.create({
    data: { who: owner, action: "created project", target: project.name, detail: `due ${project.due?.toISOString().split("T")[0] ?? "TBD"}`, type: "general", projectId: project.id },
  });

  return NextResponse.json(project, { status: 201 });
}
