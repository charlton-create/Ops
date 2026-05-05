import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const team = await prisma.teamMember.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(team);
}
