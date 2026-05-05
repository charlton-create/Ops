import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const demo = await prisma.demoRequest.update({ where: { id: parseInt(id) }, data: body });
  return NextResponse.json(demo);
}
