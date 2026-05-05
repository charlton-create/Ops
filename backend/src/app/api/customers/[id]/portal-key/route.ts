import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

function generateKey(): string {
  return `cati_pk_${randomBytes(24).toString("hex")}`;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("support.admin");
  if (error) return error;

  const { id } = await params;
  const customerId = parseInt(id);

  const newKey = generateKey();
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { portalApiKey: newKey },
    select: { id: true, company: true, portalApiKey: true },
  });

  return NextResponse.json(customer);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("support.admin");
  if (error) return error;
  const { id } = await params;
  const customer = await prisma.customer.update({
    where: { id: parseInt(id) },
    data: { portalApiKey: null },
    select: { id: true, company: true, portalApiKey: true },
  });
  return NextResponse.json(customer);
}
