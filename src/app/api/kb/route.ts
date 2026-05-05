import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const docs = await prisma.kBDocument.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(docs);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("kb.edit");
  if (error) return error;

  const body = await request.json();
  const doc = await prisma.kBDocument.create({ data: body });
  return NextResponse.json(doc, { status: 201 });
}
