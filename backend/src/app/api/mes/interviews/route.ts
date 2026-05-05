import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const interviews = await prisma.mESInterview.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(interviews);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await request.json();

  const interview = await prisma.mESInterview.create({
    data: {
      companyName: body.companyName,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      module: body.module,
      responses: body.responses,
      submittedBy: session!.user?.name ?? "Unknown",
      leadId: body.leadId,
      status: body.status ?? "completed",
      notes: body.notes,
    },
  });

  await prisma.activity.create({
    data: {
      who: session!.user?.name ?? "Unknown",
      action: "completed MES interview",
      target: body.companyName,
      detail: body.module ? `Module: ${body.module}` : "General intake",
      type: "general",
    },
  });

  return NextResponse.json(interview, { status: 201 });
}
