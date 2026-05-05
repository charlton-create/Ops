import { prisma } from "@/lib/db";
import { activateZohoBilling } from "@/lib/zoho/billing";

const MODULE_SLUGS: Record<string, string> = {
  "CAT-I": "cat-i",
  "CAT-MES": "cat-mes",
  "CAT-QT": "cat-qt",
  "CAT-SCAN": "cat-scan",
  "CAT-ALOG": "cat-alog",
  "Full Platform": "full-platform",
};

function slugify(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function provisionTenant(lead: {
  company: string;
  contact: string;
  email: string;
  modules: string[];
}) {
  const apiKey = process.env.TENANT_API_KEY;
  if (!apiKey) {
    console.warn("[provisionTenant] TENANT_API_KEY not set — skipping");
    return;
  }

  const enabledModules = lead.modules
    .map((m) => MODULE_SLUGS[m] || m.toLowerCase())
    .filter(Boolean);

  const payload = {
    slug: slugify(lead.company),
    companyName: lead.company,
    enabledModules,
    adminEmail: lead.email,
    adminName: lead.contact,
  };

  try {
    const res = await fetch("https://admin.cat-i.ai/api/local/tenants", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[provisionTenant] ${res.status} ${res.statusText}: ${body}`);
    } else {
      console.log(`[provisionTenant] Tenant provisioned for ${lead.company}`);
    }
  } catch (err) {
    console.error("[provisionTenant] Request failed:", err);
  }
}

/**
 * Converts a lead to a customer when its stage transitions to "Closed Won".
 * Idempotent — if the lead is already converted, does nothing.
 * Creates a Customer, marks the Lead as converted, logs an activity, and
 * provisions the tenant in the admin system with the selected modules.
 */
export async function convertLeadToCustomerIfWon(leadId: number) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { owner: true },
  });

  if (!lead) return;
  if (lead.stage !== "Closed Won") return;
  if (lead.convertedToCustomer) return;

  const today = new Date();
  const contractEnd = new Date(today);
  contractEnd.setFullYear(contractEnd.getFullYear() + 1);

  const newCustomer = await prisma.customer.create({
    data: {
      leadId,
      company: lead.company,
      contact: lead.contact,
      title: lead.title,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      modules: lead.modules,
      certifications: lead.certifications,
      facilities: lead.facilities,
      ownerId: lead.ownerId,
      contractValue: lead.value,
      contractStart: today,
      contractEnd,
      status: "onboarding",
      billingStatus: "pending",
      notes: lead.notes as any,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { convertedToCustomer: true },
  });

  await prisma.activity.create({
    data: {
      who: lead.owner.name,
      action: "converted to customer",
      target: lead.company,
      detail: `$${lead.value.toLocaleString()} contract`,
      type: "general",
      leadId,
    },
  });

  // Provision tenant in admin system (non-blocking — errors are logged, not thrown)
  await provisionTenant({
    company: lead.company,
    contact: lead.contact,
    email: lead.email ?? "",
    modules: lead.modules,
  });

  // Create Zoho Books contact + invoice (non-blocking — errors are logged, not thrown)
  await activateZohoBilling(newCustomer.id);
}
