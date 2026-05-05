import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { nextTicketNumber, defaultQueueForLevel } from "@/lib/tickets/numbering";
import { sendTicketCreatedEmail } from "@/lib/tickets/email";

const ALLOWED_MODULES = ["CAT-I Base", "CAT-MES", "CAT-QT", "CAT-SCAN", "CAT-ALOG", "Full Platform"];
const ALLOWED_SEVERITY = ["low", "medium", "high", "critical"];
const ALLOWED_PRIORITY = ["normal", "technical", "critical"];

function severityToLevel(severity: string, priority: string): number {
  if (severity === "critical" || priority === "critical") return 3;
  if (severity === "high" || priority === "technical") return 2;
  return 1;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Customer-Portal-Key",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders();
  try {
    const apiKey = request.headers.get("x-customer-portal-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing X-Customer-Portal-Key header" }, { status: 401, headers });
    }

    const customer = await prisma.customer.findUnique({ where: { portalApiKey: apiKey } });
    if (!customer) {
      return NextResponse.json({ error: "Invalid portal API key" }, { status: 401, headers });
    }

    const body = await request.json();

    // Required fields per spec: module, ticket description, date, severity, priority, customer name (email)
    const { module, description, severity, priority, customerEmail, subject, contactName, contactPhone } = body;

    if (!module || !ALLOWED_MODULES.includes(module)) {
      return NextResponse.json({ error: `module is required and must be one of: ${ALLOWED_MODULES.join(", ")}` }, { status: 400, headers });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "description is required" }, { status: 400, headers });
    }

    const sev = ALLOWED_SEVERITY.includes(severity) ? severity : "medium";
    const pri = ALLOWED_PRIORITY.includes(priority) ? priority : "normal";

    // Match customer by email per spec: "use the email ID as the matching field"
    let resolvedEmail = customerEmail || customer.email;
    if (customerEmail && customerEmail !== customer.email) {
      // Email mismatch — verify it belongs to the same customer record
      const altCustomer = await prisma.customer.findFirst({ where: { email: customerEmail } });
      if (altCustomer && altCustomer.id !== customer.id) {
        return NextResponse.json({ error: "Email does not match this customer's portal key" }, { status: 403, headers });
      }
    }

    const level = severityToLevel(sev, pri);
    const ticketNumber = await nextTicketNumber();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        level,
        status: "open",
        module,
        category: pri === "critical" ? "System Outage" : pri === "technical" ? "Module Bug" : "How-To / Workflow",
        subject: (subject || description).slice(0, 200),
        description,
        customerId: customer.id,
        customerCompany: customer.company,
        contactName: contactName || customer.contact || null,
        contactEmail: resolvedEmail || null,
        contactPhone: contactPhone || customer.phone || null,
        assigneeQueue: defaultQueueForLevel(level),
        source: "portal",
        priority: pri,
        severity: sev,
      },
      include: {
        customer: { select: { id: true, company: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await prisma.activity.create({
      data: {
        who: customer.company,
        action: "submitted ticket via portal",
        target: ticket.ticketNumber,
        detail: ticket.subject,
        type: "support",
      },
    });

    void sendTicketCreatedEmail(ticket as any);

    return NextResponse.json(
      {
        ticketNumber: ticket.ticketNumber,
        id: ticket.id,
        level: ticket.level,
        status: ticket.status,
      },
      { status: 201, headers },
    );
  } catch (err: any) {
    console.error("POST /api/portal/tickets error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500, headers });
  }
}
