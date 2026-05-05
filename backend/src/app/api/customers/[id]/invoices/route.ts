import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("customers.billing");
  if (error) return error;

  const { id } = await params;
  const customerId = parseInt(id);
  const { amount, description } = await request.json();

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.zohoInvoice.create({
    data: {
      id: `INV-${Date.now()}`,
      customerId,
      invoiceNumber: `INV-${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`,
      date: today,
      dueDate,
      amount,
      status: "sent",
      zohoUrl: `https://books.zoho.com/app#/invoices/${Date.now()}`,
    },
  });

  await prisma.activity.create({
    data: {
      who: session!.user.name,
      action: "created invoice",
      target: customer.company,
      detail: `$${amount.toLocaleString()} - ${invoice.invoiceNumber}`,
      type: "general",
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
