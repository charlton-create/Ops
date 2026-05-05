import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const date = request.nextUrl.searchParams.get("date");
  const user = request.nextUrl.searchParams.get("user");
  const where: any = {};
  if (date) where.date = new Date(date);
  if (user) where.assignee = user;

  const events = await prisma.calendarEvent.findMany({ where, orderBy: { date: "asc" } });
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  if (body.date) body.date = new Date(body.date);
  const event = await prisma.calendarEvent.create({ data: body });
  return NextResponse.json(event, { status: 201 });
}
