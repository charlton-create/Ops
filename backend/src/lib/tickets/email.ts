import { sendEmail } from "@/lib/email/ses";
import { prisma } from "@/lib/db";
import { SLA_HOURS } from "./numbering";

interface TicketLike {
  ticketNumber: string;
  level: number;
  status: string;
  subject: string;
  contactEmail?: string | null;
  contactName?: string | null;
  customerCompany: string;
  assigneeQueue?: string | null;
  assignedTo?: { name: string } | null;
}

const LEVEL_LABEL: Record<number, string> = { 1: "L1 · Training", 2: "L2 · Isolated", 3: "L3 · Critical" };

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v ?? "");
  }
  return out;
}

function wrapHtml(body: string, ticketNumber: string): string {
  const safe = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
    <div style="border-bottom:2px solid #1A56DB;padding-bottom:12px;margin-bottom:20px;">
      <strong style="color:#1A56DB;font-size:18px;">CAT-I.AI Support</strong>
      <span style="float:right;font-family:monospace;color:#6B7280;font-size:13px;">${ticketNumber}</span>
    </div>
    <div style="font-size:14px;line-height:1.7;">${safe}</div>
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;font-size:11px;color:#6B7280;">
      AUDIT-READY ALL THE TIME
    </div>
  </body></html>`;
}

async function getSettings() {
  let s = await prisma.ticketingSettings.findFirst();
  if (!s) {
    s = await prisma.ticketingSettings.create({ data: {} });
  }
  return s;
}

export async function sendTicketCreatedEmail(ticket: TicketLike): Promise<void> {
  if (!ticket.contactEmail) return;
  const settings = await getSettings();
  if (!settings.autoReplyEnabled) return;

  const assignee = ticket.assignedTo?.name || ticket.assigneeQueue || "Support Team";
  const sla = `${SLA_HOURS[ticket.level] ?? 4} hours`;

  const body = fillTemplate(settings.autoReplyTemplate, {
    TICKET_ID: ticket.ticketNumber,
    ASSIGNEE: assignee,
    SLA: sla,
    LEVEL: LEVEL_LABEL[ticket.level] ?? `L${ticket.level}`,
  });

  try {
    await sendEmail({
      to: ticket.contactEmail,
      subject: `[${ticket.ticketNumber}] ${ticket.subject}`,
      htmlBody: wrapHtml(body, ticket.ticketNumber),
      fromName: "CAT-I.AI Support",
      fromEmail: settings.supportEmail,
    });
  } catch (err: any) {
    console.error("[ticket email] auto-reply failed:", err.message);
  }
}

export async function sendTicketStatusEmail(ticket: TicketLike, message: string): Promise<void> {
  if (!ticket.contactEmail) return;
  const settings = await getSettings();

  const body = fillTemplate(settings.statusChangeTemplate, {
    TICKET_ID: ticket.ticketNumber,
    STATUS: ticket.status,
    MESSAGE: message,
  });

  try {
    await sendEmail({
      to: ticket.contactEmail,
      subject: `[${ticket.ticketNumber}] Status update: ${ticket.status}`,
      htmlBody: wrapHtml(body, ticket.ticketNumber),
      fromName: "CAT-I.AI Support",
      fromEmail: settings.supportEmail,
    });
  } catch (err: any) {
    console.error("[ticket email] status email failed:", err.message);
  }
}

export async function sendTicketEscalatedEmail(ticket: TicketLike): Promise<void> {
  if (!ticket.contactEmail) return;
  const settings = await getSettings();

  const body = fillTemplate(settings.escalationTemplate, {
    TICKET_ID: ticket.ticketNumber,
    LEVEL: LEVEL_LABEL[ticket.level] ?? `L${ticket.level}`,
    SLA: `${SLA_HOURS[ticket.level] ?? 4} hours`,
  });

  try {
    await sendEmail({
      to: ticket.contactEmail,
      subject: `[${ticket.ticketNumber}] Escalated to ${LEVEL_LABEL[ticket.level]}`,
      htmlBody: wrapHtml(body, ticket.ticketNumber),
      fromName: "CAT-I.AI Support",
      fromEmail: settings.supportEmail,
    });
  } catch (err: any) {
    console.error("[ticket email] escalation email failed:", err.message);
  }
}

export async function sendTicketResolvedEmail(ticket: TicketLike, resolution: string): Promise<void> {
  if (!ticket.contactEmail) return;
  const settings = await getSettings();

  const body = fillTemplate(settings.completionTemplate, {
    TICKET_ID: ticket.ticketNumber,
    RESOLUTION: resolution || "Issue resolved.",
  });

  try {
    await sendEmail({
      to: ticket.contactEmail,
      subject: `[${ticket.ticketNumber}] Resolved: ${ticket.subject}`,
      htmlBody: wrapHtml(body, ticket.ticketNumber),
      fromName: "CAT-I.AI Support",
      fromEmail: settings.supportEmail,
    });
  } catch (err: any) {
    console.error("[ticket email] resolution email failed:", err.message);
  }
}

export async function sendCustomerNoteEmail(ticket: TicketLike, noteContent: string): Promise<void> {
  if (!ticket.contactEmail) return;
  const settings = await getSettings();

  try {
    await sendEmail({
      to: ticket.contactEmail,
      subject: `[${ticket.ticketNumber}] Update on your support ticket`,
      htmlBody: wrapHtml(noteContent, ticket.ticketNumber),
      fromName: "CAT-I.AI Support",
      fromEmail: settings.supportEmail,
    });
  } catch (err: any) {
    console.error("[ticket email] customer note email failed:", err.message);
  }
}
