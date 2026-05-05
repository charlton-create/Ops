import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const demos = await prisma.demoRequest.findMany({ orderBy: { submittedAt: "desc" } });
  return NextResponse.json(demos);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const demo = await prisma.demoRequest.create({ data: body });
  return NextResponse.json(demo, { status: 201 });
}
