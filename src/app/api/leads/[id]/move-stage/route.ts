import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const STAGE_PROBABILITIES: Record<string, number> = {
  "New Lead": 5, "Qualified": 15, "Discovery": 25, "Technical Review": 40,
  "Proposal Sent": 55, "Module Selection": 70, "Contract Review": 85,
  "Closed Won": 100, "Closed Lost": 0,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("leads.edit");
  if (error) return error;

  const { id } = await params;
  const { stage } = await request.json();
  const leadId = parseInt(id);

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage,
      probability: STAGE_PROBABILITIES[stage] ?? 0,
      lastActivity: new Date(),
    },
    include: { owner: true },
  });

  await prisma.activity.create({
    data: {
      who: lead.owner.name,
      action: "moved",
      target: lead.company,
      detail: `to ${stage}`,
      type: "stage_change",
      leadId,
    },
  });

  // Auto-convert to customer on Closed Won
  if (stage === "Closed Won" && !lead.convertedToCustomer) {
    const today = new Date();
    const contractEnd = new Date(today);
    contractEnd.setFullYear(contractEnd.getFullYear() + 1);

    await prisma.customer.create({
      data: {
        leadId,
        company: lead.company,
        contact: lead.contact,
        title: lead.title,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        modules: lead.modules,
        certifications: lead.certifications,
        facilities: lead.facilities,
        ownerId: lead.ownerId,
        contractValue: lead.value,
        contractStart: today,
        contractEnd,
        status: "onboarding",
        billingStatus: "pending",
        notes: lead.notes,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { convertedToCustomer: true },
    });

    await prisma.activity.create({
      data: {
        who: lead.owner.name,
        action: "converted to customer",
        target: lead.company,
        detail: `$${lead.value.toLocaleString()} contract`,
        type: "general",
        leadId,
      },
    });
  }

  return NextResponse.json(lead);
}
