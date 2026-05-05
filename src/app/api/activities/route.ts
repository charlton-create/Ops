import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const leadId = request.nextUrl.searchParams.get("leadId");
  const where = leadId ? { leadId: parseInt(leadId) } : {};

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const activity = await prisma.activity.create({ data: body });
  return NextResponse.json(activity, { status: 201 });
}
