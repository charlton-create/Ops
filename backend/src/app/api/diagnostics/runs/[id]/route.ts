import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("diagnostics.view");
  if (error) return error;
  const { id } = await params;
  const run = await prisma.diagnosticRun.findUnique({
    where: { id: parseInt(id) },
    include: { startedBy: { select: { id: true, name: true } } },
  });
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ ...run, startedByName: run.startedBy?.name ?? null });
}
