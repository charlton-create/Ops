import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { zohoGet, zohoPost } from "@/lib/zoho/client";
import { NextRequest, NextResponse } from "next/server";

// Send the most recent Zoho Books invoice to the customer via email
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("customers.billing");
  if (error) return error;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id: parseInt(id) } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (!customer.zohoCustomerId) {
    return NextResponse.json({ error: "Customer not synced to Zoho Books" }, { status: 400 });
  }

  // Find invoices for this contact in Zoho Books
  const invoicesRes = await zohoGet<any>(
    `/invoices?customer_id=${customer.zohoCustomerId}&sort_column=date&sort_order=D`
  );
  const invoices = invoicesRes.invoices || [];
  if (invoices.length === 0) {
    return NextResponse.json({ error: "No invoices found in Zoho Books" }, { status: 404 });
  }

  const latestInvoice = invoices[0];

  // Send the invoice email via Zoho Books
  await zohoPost(`/invoices/${latestInvoice.invoice_id}/email`, {
    to_mail_ids: [customer.email],
    subject: `Invoice ${latestInvoice.invoice_number} from CAT-I.AI`,
    body: `Dear ${customer.contact},\n\nPlease find your invoice attached. You can pay online using the link in the invoice.\n\nThank you for choosing CAT-I.AI.\n\nBest regards,\nCAT-I.AI Team`,
  });

  return NextResponse.json({ ok: true, invoiceNumber: latestInvoice.invoice_number });
}
