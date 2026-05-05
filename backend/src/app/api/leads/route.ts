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

  // Flatten owner object to owner string (Angular expects owner as team member name)
  const mapped = leads.map((l) => ({
    ...l,
    owner: (l.owner as any)?.name ?? "",
    ownerColor: (l.owner as any)?.color ?? "#6B7280",
    ownerId: l.ownerId,
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("leads.edit");
  if (error) return error;

  try {
    const body = await request.json();

    const ownerName = body.owner ?? "David";
    const ownerMember = await prisma.teamMember.findFirst({ where: { name: ownerName } });
    if (!ownerMember) return NextResponse.json({ error: "Owner not found" }, { status: 400 });

    const lead = await prisma.lead.create({
      data: {
        company: body.company ?? "",
        contact: body.contact ?? "",
        title: body.title,
        stage: body.stage ?? "New Lead",
        value: body.value ?? 0,
        probability: body.probability ?? 5,
        modules: body.modules ?? [],
        certifications: body.certifications ?? [],
        facilities: body.facilities ?? 1,
        ownerId: ownerMember.id,
        priority: body.priority ?? "medium",
        lastActivity: new Date(),
        nextAction: body.nextAction,
        source: body.source,
        notes: typeof body.notes === "string" ? body.notes : body.notes ? JSON.stringify(body.notes) : null,
        industry: body.industry,
        email: body.email,
        phone: body.phone,
        convertedToCustomer: body.convertedToCustomer ?? false,
      },
      include: { owner: true },
    });

    await prisma.activity.create({
      data: { who: ownerName, action: "added lead", target: lead.company, detail: lead.source ?? "", type: "general", leadId: lead.id },
    });

    return NextResponse.json({
      ...lead,
      owner: (lead.owner as any)?.name ?? ownerName,
      ownerColor: (lead.owner as any)?.color ?? "#6B7280",
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/leads error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
