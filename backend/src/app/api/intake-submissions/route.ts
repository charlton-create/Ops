import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const submissions = await prisma.intakeSubmission.findMany({
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json(submissions);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await request.json();

  const submission = await prisma.intakeSubmission.create({
    data: {
      status: body.status ?? "submitted",
      interviewedBy: body.interviewedBy ?? session!.user.name,
      leadId: body.leadId,
      companyName: body.companyName ?? "",
      industry: body.industry,
      facilities: body.facilities ?? 1,
      employees: body.employees ?? 0,
      contactName: body.contactName,
      contactTitle: body.contactTitle,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      certifications: body.certifications ?? [],
      gfsiBenchmarked: body.gfsiBenchmarked,
      lastAuditDate: body.lastAuditDate,
      biggestChallenge: body.biggestChallenge,
      modulesOfInterest: body.modulesOfInterest ?? [],
      timeline: body.timeline,
      source: body.source,
      notes: body.notes,
    },
  });

  await prisma.activity.create({
    data: {
      who: session!.user.name,
      action: "submitted intake form",
      target: body.companyName ?? "",
      detail: body.source ?? "Intake Form",
      type: "general",
    },
  });

  return NextResponse.json(submission, { status: 201 });
}
