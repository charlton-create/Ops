import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";
import { sendTicketStatusEmail, sendTicketResolvedEmail } from "@/lib/tickets/email";

const TICKET_INCLUDE = {
  customer: { select: { id: true, company: true, email: true, contact: true, phone: true } },
  assignedTo: { select: { id: true, name: true, color: true } },
  notes: { orderBy: { createdAt: "asc" as const } },
};

function mapTicket(t: any) {
  return {
    ...t,
    assignee: t.assignedTo?.name ?? t.assigneeQueue ?? null,
    assigneeColor: t.assignedTo?.color ?? null,
    customerName: t.customer?.company ?? t.customerCompany,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) },
    include: TICKET_INCLUDE,
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(mapTicket(ticket));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("support.edit");
  if (error) return error;

  const { id } = await params;
  const ticketId = parseInt(id);
  const body = await request.json();

  const before = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!before) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const data: any = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "resolved") data.resolvedAt = new Date();
    if (before.status === "resolved" && body.status !== "resolved") data.resolvedAt = null;
  }
  if (body.level !== undefined) data.level = Number(body.level);
  if (body.module !== undefined) data.module = body.module;
  if (body.category !== undefined) data.category = body.category;
  if (body.subject !== undefined) data.subject = body.subject;
  if (body.description !== undefined) data.description = body.description;
  if (body.contactName !== undefined) data.contactName = body.contactName;
  if (body.contactTitle !== undefined) data.contactTitle = body.contactTitle;
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.severity !== undefined) data.severity = body.severity;
  if (body.attachments !== undefined) data.attachments = body.attachments;

  if (body.assignedToId !== undefined) {
    if (body.assignedToId === null || body.assignedToId === "") {
      data.assignedToId = null;
    } else {
      data.assignedToId = parseInt(body.assignedToId);
      data.assigneeQueue = null;
    }
  }
  if (body.assigneeQueue !== undefined && data.assignedToId === undefined) {
    data.assigneeQueue = body.assigneeQueue;
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: TICKET_INCLUDE,
  });

  // Activity log
  if (body.status && body.status !== before.status) {
    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: `ticket → ${body.status}`,
        target: ticket.ticketNumber,
        detail: ticket.subject,
        type: "support",
      },
    });
    if (body.status === "resolved") {
      void sendTicketResolvedEmail(ticket as any, body.resolutionMessage || "");
    } else {
      void sendTicketStatusEmail(ticket as any, body.statusMessage || "");
    }
  }

  return NextResponse.json(mapTicket(ticket));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("support.delete");
  if (error) return error;
  const { id } = await params;
  await prisma.ticket.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
