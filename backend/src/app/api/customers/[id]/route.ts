import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const SCALAR_FIELDS = new Set([
  "company", "contact", "title", "email", "phone", "industry",
  "modules", "certifications", "facilities", "contractValue",
  "contractStart", "contractEnd", "status", "billingStatus",
  "zohoCustomerId", "notes",
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("customers.edit");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SCALAR_FIELDS.has(key)) data[key] = value;
  }

  // notes column is a plain String; stringify if an array/object is sent
  if ("notes" in data && data.notes !== null && typeof data.notes !== "string") {
    data.notes = JSON.stringify(data.notes);
  }

  // Resolve owner name → ownerId
  if (typeof body.owner === "string" && body.owner.trim()) {
    const member = await prisma.teamMember.findFirst({ where: { name: body.owner } });
    if (member) data.ownerId = member.id;
  }

  const customer = await prisma.customer.update({
    where: { id: parseInt(id) },
    data,
    include: { owner: true, invoices: true },
  });
  return NextResponse.json({
    ...customer,
    owner: (customer.owner as any)?.name ?? "",
    ownerColor: (customer.owner as any)?.color ?? "#6B7280",
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("customers.edit");
  if (error) return error;

  const { id } = await params;
  const customerId = parseInt(id);

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, leadId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Reset the originating lead so it's no longer marked as converted —
  // ZohoInvoice rows cascade automatically via the schema
  await prisma.$transaction([
    prisma.lead.update({
      where: { id: existing.leadId },
      data: { convertedToCustomer: false },
    }),
    prisma.customer.delete({ where: { id: customerId } }),
  ]);

  return NextResponse.json({ ok: true });
}
