import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";
import { nextTicketNumber, defaultQueueForLevel } from "@/lib/tickets/numbering";
import { sendTicketCreatedEmail } from "@/lib/tickets/email";

function mapTicket(t: any) {
  return {
    ...t,
    assignee: t.assignedTo?.name ?? t.assigneeQueue ?? null,
    assigneeColor: t.assignedTo?.color ?? null,
    customerName: t.customer?.company ?? t.customerCompany,
    notesCount: t._count?.notes ?? t.notes?.length ?? 0,
  };
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const sp = request.nextUrl.searchParams;
  const level = sp.get("level");
  const status = sp.get("status");
  const customerId = sp.get("customerId");
  const source = sp.get("source");

  const where: any = {};
  if (level) where.level = parseInt(level);
  if (status) where.status = status;
  if (customerId) where.customerId = parseInt(customerId);
  if (source) where.source = source;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      customer: { select: { id: true, company: true, email: true } },
      assignedTo: { select: { id: true, name: true, color: true } },
      _count: { select: { notes: true } },
    },
    orderBy: [{ level: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tickets.map(mapTicket));
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission("support.edit");
  if (error) return error;

  try {
    const body = await request.json();
    const level = Number(body.level) || 1;
    const ticketNumber = await nextTicketNumber();

    let customerId: number | null = null;
    let customerCompany = body.customerCompany || body.customerName || "";

    if (body.customerId) {
      const c = await prisma.customer.findUnique({ where: { id: parseInt(body.customerId) } });
      if (c) { customerId = c.id; customerCompany = c.company; }
    }
    if (!customerId && body.contactEmail) {
      const c = await prisma.customer.findFirst({ where: { email: body.contactEmail } });
      if (c) { customerId = c.id; customerCompany = c.company; }
    }

    let assignedToId: number | null = null;
    if (body.assignedToId) {
      assignedToId = parseInt(body.assignedToId);
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        level,
        status: body.status || "open",
        module: body.module || "CAT-I Base",
        category: body.category || "How-To / Workflow",
        subject: body.subject || "",
        description: body.description || "",
        customerId,
        customerCompany,
        contactName: body.contactName || null,
        contactTitle: body.contactTitle || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        assignedToId,
        assigneeQueue: assignedToId ? null : (body.assigneeQueue || defaultQueueForLevel(level)),
        source: body.source || "internal",
        priority: body.priority || "normal",
        severity: body.severity || "medium",
        attachments: body.attachments ?? [],
      },
      include: {
        customer: { select: { id: true, company: true, email: true } },
        assignedTo: { select: { id: true, name: true, color: true } },
        _count: { select: { notes: true } },
      },
    });

    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: "created ticket",
        target: ticket.ticketNumber,
        detail: ticket.subject,
        type: "support",
      },
    });

    void sendTicketCreatedEmail(ticket);

    return NextResponse.json(mapTicket(ticket), { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tickets error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
