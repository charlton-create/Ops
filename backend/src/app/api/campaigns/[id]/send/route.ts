import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { sendEmail } from "@/lib/email/ses";
import { interpolateMergeFields } from "@/lib/email/merge";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("content.publish");
  if (error) return error;

  const { id } = await params;
  const campaignId = parseInt(id);

  // 1. Load campaign
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "Sent") return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });

  // 2. Resolve recipient list from leads based on audience
  const audience = campaign.audience as { type: string; stages?: string[]; modules?: string[] } | null;
  let leads;

  if (audience?.type === "by_stage" && audience.stages?.length) {
    leads = await prisma.lead.findMany({
      where: {
        stage: { in: audience.stages },
        email: { not: "" },
      },
      include: { owner: true },
    });
  } else if (audience?.type === "by_module" && audience.modules?.length) {
    leads = await prisma.lead.findMany({
      where: {
        modules: { hasSome: audience.modules },
        email: { not: "" },
      },
      include: { owner: true },
    });
  } else {
    // all_leads — exclude Closed Won/Lost
    leads = await prisma.lead.findMany({
      where: {
        stage: { notIn: ["Closed Won", "Closed Lost"] },
        email: { not: "" },
      },
      include: { owner: true },
    });
  }

  // Filter out leads with no email
  const validLeads = leads.filter((l) => l.email && l.email.trim() !== "");

  if (validLeads.length === 0) {
    return NextResponse.json({ error: "No recipients with valid email addresses" }, { status: 400 });
  }

  // 3. Get sender info
  const senderName = campaign.fromName ?? session!.user.name;
  const senderEmail = campaign.fromEmail ?? undefined;
  const senderMember = await prisma.teamMember.findFirst({ where: { name: senderName } });

  // 4. Build personalized emails and send with per-recipient tracking
  const emailTemplate = campaign.bodyHtml ?? "";
  // Only run merge interpolation if the template actually contains merge fields.
  // Uploaded HTML templates don't have {{...}} tokens — interpolating them can corrupt
  // complex HTML (VML, base64 images, nested structures).
  const hasMergeFields = /\{\{(contact_name|company_name|from_name|from_email|from_role|body_content|cta_block|image_block)\}\}/.test(emailTemplate);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of validLeads) {
    const html = hasMergeFields
      ? interpolateMergeFields(emailTemplate, {
          contact_name: lead.contact,
          company_name: lead.company,
          from_name: senderName,
          from_email: senderEmail ?? process.env.SES_FROM_EMAIL ?? "dev@cat-i.ai",
          from_role: senderMember?.role ?? "",
          body_content: campaign.bodyHtml ?? "",
        })
      : emailTemplate;

    try {
      await sendEmail({
        to: lead.email!,
        subject: campaign.subject ?? "Message from CAT-I.AI",
        htmlBody: html,
        fromName: senderName,
        fromEmail: senderEmail,
      });

      await prisma.campaignRecipient.create({
        data: {
          campaignId,
          leadId: lead.id,
          email: lead.email!,
          status: "sent",
        },
      });
      sent++;
      await new Promise((r) => setTimeout(r, 100)); // SES rate limit
    } catch (err: any) {
      await prisma.campaignRecipient.create({
        data: {
          campaignId,
          leadId: lead.id,
          email: lead.email!,
          status: "failed",
          error: err.message,
        },
      });
      failed++;
      errors.push(`${lead.email}: ${err.message}`);
    }
  }

  // 5. Update campaign in DB
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "Sent",
      sentDate: new Date(),
      recipients: sent + failed,
    },
  });

  // 6. Log activity
  await prisma.activity.create({
    data: {
      who: session!.user.name,
      action: "sent campaign",
      target: campaign.name,
      detail: `${sent} sent${failed > 0 ? `, ${failed} failed` : ""}`,
      type: "email",
    },
  });

  return NextResponse.json({ sent, failed, errors, campaignId });
}
