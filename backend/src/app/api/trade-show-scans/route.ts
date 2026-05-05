import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

// GET — list all trade show scans
export async function GET(request: NextRequest) {
  const { error } = await requirePermission("leads.view");
  if (error) return error;

  const scans = await prisma.tradeShowScan.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(scans);
}

// POST — save a new QR code scan
export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission("leads.edit");
  if (error) return error;

  const body = await request.json();
  const { rawData, parsedData, source, notes, leadId } = body;

  if (!rawData) {
    return NextResponse.json({ error: "rawData is required" }, { status: 400 });
  }

  const scan = await prisma.tradeShowScan.create({
    data: {
      rawData,
      parsedData: parsedData ?? null,
      source: source ?? null,
      scannedBy: session!.user.name,
      leadId: leadId ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(scan, { status: 201 });
}
