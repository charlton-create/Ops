import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const demo = await prisma.demoRequest.create({
    data: {
      fullName: body.fullName || body.name,
      email: body.email,
      position: body.position || body.title,
      companyName: body.companyName || body.company,
      businessType: body.businessType || "",
      industry: body.industry || "",
      preferredTime: body.preferredTime || "",
      preferredDate: body.preferredDate ? new Date(body.preferredDate) : undefined,
      selectedModules: body.selectedModules || [],
      demoFocus: body.demoFocus || body.message || "",
      status: "new",
    },
  });

  await prisma.activity.create({
    data: {
      who: "Website",
      action: "submitted demo request",
      target: body.companyName || body.fullName || body.name,
      detail: "via cat-i.ai contact form",
      type: "general",
    },
  });

  return NextResponse.json({ id: demo.id, status: "received" }, { status: 201 });
}
