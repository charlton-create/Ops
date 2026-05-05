import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Zoho Books webhooks — no JWT auth (public endpoint), verified by matching zohoCustomerId
// Zoho sends events like invoice.paid, invoice.overdue etc.
// Configure in Zoho Books → Settings → Automation → Webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event_type || body.event || "";
    const invoice = body.invoice || body.data?.invoice || body;

    const zohoContactId =
      invoice.customer_id || invoice.contact_id || body.customer_id || "";
    const invoiceNumber = invoice.invoice_number || body.invoice_number || "";
    const invoiceId = invoice.invoice_id || body.invoice_id || "";
    const status = invoice.status || body.status || "";
    const balanceDue = invoice.balance ?? body.balance ?? null;

    console.log(
      `[zoho-webhook] event=${event} invoice=${invoiceNumber} status=${status} contact=${zohoContactId}`
    );

    if (!zohoContactId) {
      return NextResponse.json({ ok: true, skipped: "no contact id" });
    }

    // Find our customer by the Zoho contact ID we stored on conversion
    const customer = await prisma.customer.findFirst({
      where: { zohoCustomerId: zohoContactId },
    });
    if (!customer) {
      console.warn(`[zoho-webhook] No customer found for Zoho contact ${zohoContactId}`);
      return NextResponse.json({ ok: true, skipped: "customer not found" });
    }

    // Map Zoho invoice status to our billingStatus
    let billingStatus = customer.billingStatus;
    if (status === "paid" || event.includes("paid")) {
      billingStatus = "active";
    } else if (status === "overdue" || event.includes("overdue")) {
      billingStatus = "past_due";
    } else if (status === "sent" || event.includes("sent")) {
      billingStatus = "invoiced";
    } else if (status === "partially_paid") {
      billingStatus = "partial";
    } else if (status === "void" || event.includes("void")) {
      billingStatus = "void";
    }

    // Update customer billing status
    if (billingStatus !== customer.billingStatus) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { billingStatus },
      });

      await prisma.activity.create({
        data: {
          who: "Zoho",
          action: "billing status updated",
          target: customer.company,
          detail: `${customer.billingStatus} → ${billingStatus} (Invoice ${invoiceNumber || invoiceId})`,
          type: "general",
        },
      });

      console.log(
        `[zoho-webhook] Updated ${customer.company} billing: ${customer.billingStatus} → ${billingStatus}`
      );
    }

    return NextResponse.json({ ok: true, customerId: customer.id, billingStatus });
  } catch (err: any) {
    console.error("[zoho-webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
