import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  if (body.date) body.date = new Date(body.date);

  const event = await prisma.calendarEvent.update({ where: { id: parseInt(id) }, data: body });
  return NextResponse.json(event);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  await prisma.calendarEvent.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
