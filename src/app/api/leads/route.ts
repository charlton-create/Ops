import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const stage = request.nextUrl.searchParams.get("stage");
  const where = stage ? { stage } : {};

  const leads = await prisma.lead.findMany({
    where,
    include: { owner: true, expansions: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("leads.edit");
  if (error) return error;

  const body = await request.json();
  const { owner, ...data } = body;

  const ownerMember = await prisma.teamMember.findFirst({ where: { name: owner } });
  if (!ownerMember) return NextResponse.json({ error: "Owner not found" }, { status: 400 });

  const lead = await prisma.lead.create({
    data: { ...data, ownerId: ownerMember.id },
    include: { owner: true },
  });

  await prisma.activity.create({
    data: { who: owner, action: "added lead", target: lead.company, detail: lead.source ?? "", type: "general", leadId: lead.id },
  });

  return NextResponse.json(lead, { status: 201 });
}
