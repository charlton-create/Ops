import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const campaigns = await prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  const body = await request.json();
  const campaign = await prisma.emailCampaign.create({ data: body });
  return NextResponse.json(campaign, { status: 201 });
}
