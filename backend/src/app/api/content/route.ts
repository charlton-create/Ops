import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const content = await prisma.contentPiece.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(content);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  const body = await request.json();
  const piece = await prisma.contentPiece.create({ data: body });
  return NextResponse.json(piece, { status: 201 });
}
