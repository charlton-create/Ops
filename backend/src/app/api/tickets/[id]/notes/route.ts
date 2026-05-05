import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";
import { sendCustomerNoteEmail } from "@/lib/tickets/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("support.edit");
  if (error) return error;

  const { id } = await params;
  const ticketId = parseInt(id);
  const body = await request.json();

  const visibility = body.visibility === "customer" ? "customer" : "internal";
  const author = body.author || session?.user.name || "Support Agent";
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const note = await prisma.ticketNote.create({
    data: {
      ticketId,
      visibility,
      author: visibility === "internal" ? `${author} (Internal)` : author,
      content,
    },
  });

  await prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });

  if (visibility === "customer") {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignedTo: { select: { name: true } } },
    });
    if (ticket) {
      void sendCustomerNoteEmail(ticket as any, content);
      await prisma.ticketNote.update({ where: { id: note.id }, data: { emailSent: true } });
    }
  }

  return NextResponse.json(note, { status: 201 });
}
