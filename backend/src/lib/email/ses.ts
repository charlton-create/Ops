import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.SES_REGION || "us-east-1",
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || "dev@cat-i.ai";

export interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
  fromEmail?: string;
  bcc?: string[];
}

export async function sendEmail({ to, subject, htmlBody, fromName, fromEmail, bcc }: EmailParams): Promise<{ messageId: string }> {
  const senderEmail = fromEmail || FROM_EMAIL;
  const source = fromName ? `${fromName} <${senderEmail}>` : senderEmail;

  const command = new SendEmailCommand({
    Source: source,
    Destination: {
      ToAddresses: [to],
      ...(bcc?.length ? { BccAddresses: bcc } : {}),
    },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: htmlBody, Charset: "UTF-8" },
      },
    },
  });

  const result = await ses.send(command);
  return { messageId: result.MessageId ?? "" };
}

export async function sendBulkEmails(
  recipients: { email: string; html: string }[],
  subject: string,
  fromName?: string,
  fromEmail?: string,
  bcc?: string[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject,
        htmlBody: recipient.html,
        fromName,
        fromEmail,
        bcc,
      });
      sent++;
      // SES rate limit: 1 email/sec in sandbox
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err: any) {
      failed++;
      errors.push(`${recipient.email}: ${err.message}`);
    }
  }

  return { sent, failed, errors };
}
