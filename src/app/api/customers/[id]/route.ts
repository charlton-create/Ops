import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("customers.edit");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const customer = await prisma.customer.update({
    where: { id: parseInt(id) },
    data: body,
    include: { owner: true, invoices: true },
  });
  return NextResponse.json(customer);
}
