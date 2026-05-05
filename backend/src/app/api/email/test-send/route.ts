import { requirePermission } from "@/lib/auth/api";
import { sendEmail } from "@/lib/email/ses";
import { NextRequest, NextResponse } from "next/server";

// Send a single test email — for previewing campaigns before sending to all recipients
export async function POST(request: NextRequest) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  const { to, subject, bodyHtml, fromName, fromEmail } = await request.json();

  if (!to || !subject) {
    return NextResponse.json({ error: "to and subject are required" }, { status: 400 });
  }

  try {
    await sendEmail({
      to,
      subject,
      htmlBody: bodyHtml || "<p>No content</p>",
      fromName,
      fromEmail,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
