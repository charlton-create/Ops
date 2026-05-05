import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { convertLeadToCustomerIfWon } from "@/lib/leads/convert-to-customer";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("leads.edit");
  if (error) return error;

  const { id } = await params;
  const leadId = parseInt(id);
  const body = await request.json();

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: body,
    include: { owner: true },
  });

  // Auto-convert to customer if stage was changed to Closed Won
  if (body.stage === "Closed Won") {
    await convertLeadToCustomerIfWon(leadId);
  }

  return NextResponse.json({
    ...lead,
    owner: (lead.owner as any)?.name ?? "",
    ownerColor: (lead.owner as any)?.color ?? "#6B7280",
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("leads.delete");
  if (error) return error;

  const { id } = await params;
  const leadId = parseInt(id);

  // Block deletion if the lead has already been converted to a customer
  const existing = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { customer: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (existing.customer) {
    return NextResponse.json(
      { error: "This lead has been converted to a customer. Delete the customer first." },
      { status: 409 },
    );
  }

  // Null out soft references on related records that don't cascade
  await prisma.$transaction([
    prisma.intakeSubmission.updateMany({ where: { leadId }, data: { leadId: null } }),
    prisma.mESInterview.updateMany({ where: { leadId }, data: { leadId: null } }),
    prisma.tradeShowScan.updateMany({ where: { leadId }, data: { leadId: null } }),
    prisma.lead.delete({ where: { id: leadId } }),
  ]);

  return NextResponse.json({ ok: true });
}
