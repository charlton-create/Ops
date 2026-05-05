import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";
import { defaultQueueForLevel } from "@/lib/tickets/numbering";
import { sendTicketEscalatedEmail } from "@/lib/tickets/email";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("support.edit");
  if (error) return error;

  const { id } = await params;
  const ticketId = parseInt(id);

  const before = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!before) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (before.level >= 3) return NextResponse.json({ error: "Already at L3" }, { status: 400 });

  const newLevel = before.level + 1;
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      level: newLevel,
      status: "escalated",
      assigneeQueue: defaultQueueForLevel(newLevel),
      assignedToId: null,
    },
    include: {
      customer: { select: { id: true, company: true, email: true } },
      assignedTo: { select: { id: true, name: true, color: true } },
    },
  });

  await prisma.activity.create({
    data: {
      who: session?.user.name || "System",
      action: `escalated ticket to L${newLevel}`,
      target: ticket.ticketNumber,
      detail: ticket.subject,
      type: "support",
    },
  });

  void sendTicketEscalatedEmail(ticket as any);

  return NextResponse.json(ticket);
}
