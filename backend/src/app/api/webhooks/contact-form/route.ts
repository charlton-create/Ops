import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_OWNER = "David";
const VALID_MODULES = ["CAT-I", "CAT-MES", "CAT-QT", "CAT-SCAN", "CAT-ALOG", "Full Platform"];

// Module base values for lead value estimation
const MODULE_VALUES: Record<string, number> = {
  "CAT-I": 36000,
  "CAT-MES": 15000,
  "CAT-QT": 15000,
  "CAT-SCAN": 12000,
  "CAT-ALOG": 12000,
  "Full Platform": 90000,
};

export async function POST(request: NextRequest) {
  const body = await request.json();

  const company = body.company || body.companyName || "Unknown Company";
  const contact = body.contact || body.name || body.fullName || "Unknown Contact";
  const email = body.email || null;
  const phone = body.phone || null;
  const title = body.title || body.position || null;
  const industry = body.industry || null;
  const message = body.message || body.notes || null;

  // Accept modules as array or single string
  let rawModules: string[] = [];
  if (Array.isArray(body.modules)) {
    rawModules = body.modules;
  } else if (typeof body.modules === "string") {
    rawModules = [body.modules];
  } else if (typeof body.product === "string") {
    rawModules = [body.product];
  } else if (Array.isArray(body.products)) {
    rawModules = body.products;
  }
  const modules = rawModules.filter((m: string) => VALID_MODULES.includes(m));

  // Estimate lead value from selected modules
  const value = modules.includes("Full Platform")
    ? MODULE_VALUES["Full Platform"]
    : modules.reduce((sum: number, m: string) => sum + (MODULE_VALUES[m] ?? 0), 0);

  // Find default owner
  const owner = await prisma.teamMember.findFirst({ where: { name: DEFAULT_OWNER } });
  if (!owner) {
    return NextResponse.json({ error: "Default owner not configured" }, { status: 500 });
  }

  const lead = await prisma.lead.create({
    data: {
      company,
      contact,
      title,
      email,
      phone,
      industry,
      stage: "New Lead",
      value,
      probability: 5,
      modules,
      certifications: [],
      facilities: 1,
      ownerId: owner.id,
      priority: "medium",
      lastActivity: new Date(),
      nextAction: "Review contact form submission",
      source: "Website Contact Form",
      notes: message,
    },
  });

  await prisma.activity.create({
    data: {
      who: "Website",
      action: "submitted contact form",
      target: company,
      detail: contact + (email ? ` (${email})` : ""),
      type: "general",
      leadId: lead.id,
    },
  });

  return NextResponse.json({ id: lead.id, status: "received" }, { status: 201 });
}
