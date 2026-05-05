import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

async function getOrCreate() {
  let s = await prisma.ticketingSettings.findFirst();
  if (!s) s = await prisma.ticketingSettings.create({ data: {} });
  return s;
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const s = await getOrCreate();
  return NextResponse.json(s);
}

export async function PATCH(request: NextRequest) {
  const { error } = await requirePermission("support.admin");
  if (error) return error;

  const body = await request.json();
  const existing = await getOrCreate();

  const data: any = {};
  if (body.supportEmail !== undefined) data.supportEmail = body.supportEmail;
  if (body.autoReplyEnabled !== undefined) data.autoReplyEnabled = !!body.autoReplyEnabled;
  if (body.autoReplyTemplate !== undefined) data.autoReplyTemplate = body.autoReplyTemplate;
  if (body.statusChangeTemplate !== undefined) data.statusChangeTemplate = body.statusChangeTemplate;
  if (body.escalationTemplate !== undefined) data.escalationTemplate = body.escalationTemplate;
  if (body.completionTemplate !== undefined) data.completionTemplate = body.completionTemplate;
  if (body.escalationRules !== undefined) data.escalationRules = body.escalationRules;

  const updated = await prisma.ticketingSettings.update({
    where: { id: existing.id },
    data,
  });
  return NextResponse.json(updated);
}
