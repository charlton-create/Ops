import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; invId: string }> }) {
  const { error, session } = await requirePermission("customers.billing");
  if (error) return error;

  const { id, invId } = await params;
  const customerId = parseInt(id);

  // Mark invoice as paid
  const invoice = await prisma.zohoInvoice.update({
    where: { id: invId },
    data: { status: "paid" },
  });

  // Check if all invoices are now paid — update customer billing status
  const allInvoices = await prisma.zohoInvoice.findMany({ where: { customerId } });
  const allPaid = allInvoices.every((inv) => inv.status === "paid");

  if (allPaid) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { billingStatus: "current" },
    });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  await prisma.activity.create({
    data: {
      who: session!.user.name,
      action: "marked invoice paid",
      target: customer?.company ?? "",
      detail: invoice.invoiceNumber ?? invId,
      type: "general",
    },
  });

  return NextResponse.json({ ok: true, allPaid });
}
