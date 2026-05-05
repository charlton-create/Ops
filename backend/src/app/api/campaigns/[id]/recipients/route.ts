import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { sendEmail } from "@/lib/email/ses";
import { NextRequest, NextResponse } from "next/server";

// GET — list all recipients for a campaign
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("content.view");
  if (error) return error;

  const { id } = await params;
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: parseInt(id) },
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json(recipients);
}

// POST — send reminder to selected recipients (or all non-opened)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("content.publish");
  if (error) return error;

  const { id } = await params;
  const campaignId = parseInt(id);
  const body = await request.json();
  const recipientIds: number[] | undefined = body.recipientIds;

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Find recipients to remind — either specific IDs or all sent (non-opened)
  const where: any = { campaignId, status: "sent" };
  if (recipientIds?.length) {
    where.id = { in: recipientIds };
  }

  const recipients = await prisma.campaignRecipient.findMany({ where });
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients to remind" }, { status: 400 });
  }

  const senderName = campaign.fromName ?? session!.user.name;
  const senderEmail = campaign.fromEmail ?? undefined;
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: `Reminder: ${campaign.subject ?? "Message from CAT-I.AI"}`,
        htmlBody: campaign.bodyHtml ?? "",
        fromName: senderName,
        fromEmail: senderEmail,
      });

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { remindedAt: new Date() },
      });
      sent++;
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      failed++;
    }
  }

  await prisma.activity.create({
    data: {
      who: session!.user.name,
      action: "sent reminder",
      target: campaign.name,
      detail: `${sent} reminder${sent !== 1 ? "s" : ""} sent`,
      type: "email",
    },
  });

  return NextResponse.json({ sent, failed });
}
