import { EmailTemplate, CampaignEditableBlocks, CampaignRecipientPreview } from '../../core/models';

export interface SenderInfo {
  name?: string;
  role?: string;
  email?: string;
}

/**
 * Pure renderer — takes a template + recipient + sender + editable blocks
 * and returns merged HTML that can be dropped into an innerHTML / iframe.
 *
 * Used by the Email Campaigns composer AND the Leads direct-send composer
 * so both flows resolve tokens the same way.
 */
export function resolveEmailTemplate(
  template: EmailTemplate,
  blocks: CampaignEditableBlocks,
  bodyHtml: string,
  sender: SenderInfo | undefined,
  recipient: CampaignRecipientPreview,
  imageDataUrl?: string | null,
): string {
  let html = template.htmlTemplate;

  // Recipient tokens (+ legacy aliases)
  html = html.replace(/\{\{first_name\}\}/g, recipient.firstName);
  html = html.replace(/\{\{full_name\}\}/g, recipient.fullName);
  html = html.replace(/\{\{company_name\}\}/g, recipient.company);
  html = html.replace(/\{\{recipient_email\}\}/g, recipient.email);
  html = html.replace(/\{\{contact_name\}\}/g, recipient.firstName);

  // Sender tokens (+ legacy aliases)
  const senderName = sender?.name || 'Team';
  const senderRole = sender?.role || 'CAT-I.AI, Inc.';
  const senderEmail = sender?.email || 'hello@cat-i.ai';
  html = html.replace(/\{\{sender_name\}\}/g, senderName);
  html = html.replace(/\{\{sender_title\}\}/g, senderRole);
  html = html.replace(/\{\{sender_email\}\}/g, senderEmail);
  html = html.replace(/\{\{from_name\}\}/g, senderName);
  html = html.replace(/\{\{from_role\}\}/g, senderRole);
  html = html.replace(/\{\{from_email\}\}/g, senderEmail);

  // Greeting override — swap the first "Hi <firstName>," occurrence
  if (blocks.greeting && blocks.greeting.trim()) {
    const greetingResolved = blocks.greeting
      .replace(/\{\{first_name\}\}/g, recipient.firstName)
      .replace(/\{\{full_name\}\}/g, recipient.fullName);
    html = html.replace(
      />(\s*)Hi\s+[^<,]+,\s*</,
      `>$1${escapeReplacement(greetingResolved)}<`
    );
  }

  // Body
  const resolvedBody = bodyHtml && bodyHtml.trim()
    ? bodyHtml
    : (template.defaultBody || '<p style="color: #9CA3AF;">(Your content will appear here)</p>');
  html = html.replace(/\{\{body_html\}\}/g, resolvedBody);
  html = html.replace(/\{\{body_content\}\}/g, resolvedBody);

  // Closing line override
  if (blocks.closing && blocks.closing.trim()) {
    html = html.replace(
      /Looking forward to showing you what Audit-Ready All the Time really looks like\./,
      escapeReplacement(blocks.closing)
    );
  }

  // CTA — support placeholder + imported baked-in buttons
  const ctaLabel = blocks.ctaLabel?.trim();
  const ctaUrl = blocks.ctaUrl?.trim();
  if (ctaLabel && ctaUrl) {
    const ctaBlock = `<div style="text-align: center; margin: 24px 0;">
      <a href="${ctaUrl}" style="display: inline-block; padding: 14px 32px; background: #0D9488; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">${escapeHtml(ctaLabel)}</a>
    </div>`;
    html = html.replace(/\{\{cta_block\}\}/g, ctaBlock);
    html = html.replace(
      /(<a[^>]*class="cta-btn"[^>]*href=)"[^"]*"([^>]*>)([\s\S]*?)(<\/a>)/,
      `$1"${ctaUrl}"$2${escapeHtml(ctaLabel)}$4`
    );
    html = html.replace(
      /(<a href=)"https:\/\/survey\.zohopublic\.com[^"]*"([\s\S]*?>)([\s\S]*?)(<\/a>)/,
      `$1"${ctaUrl}"$2${escapeHtml(ctaLabel)}$4`
    );
    html = html.replace(
      /(<a href=)"https:\/\/docs\.google\.com\/forms[^"]*"([\s\S]*?>)([\s\S]*?)(<\/a>)/,
      `$1"${ctaUrl}"$2${escapeHtml(ctaLabel)}$4`
    );
  } else {
    html = html.replace(/\{\{cta_block\}\}/g, '');
  }

  // Image block
  if (imageDataUrl) {
    const imgBlock = `<div style="margin: 16px 0;"><img src="${imageDataUrl}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px;" /></div>`;
    html = html.replace(/\{\{image_block\}\}/g, imgBlock);
  } else {
    html = html.replace(/\{\{image_block\}\}/g, '');
  }

  // Strip wrapper tags so the HTML can render inline.
  html = html.replace(/<!DOCTYPE[^>]*>/i, '')
             .replace(/<\/?(html|head|body)[^>]*>/gi, '')
             .replace(/<meta[^>]*>/gi, '')
             .replace(/<title>[\s\S]*?<\/title>/gi, '');

  return html;
}

/** Escape `$` so it isn't interpreted as a backreference by String.replace. */
function escapeReplacement(s: string): string {
  return s.replace(/\$/g, '$$$$');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build a recipient preview object from a Lead, with safe fallbacks. */
export function recipientFromLead(lead: {
  contact?: string;
  company?: string;
  email?: string;
} | null | undefined): CampaignRecipientPreview {
  const fullName = lead?.contact?.trim() || 'there';
  const firstName = fullName.split(/\s+/)[0] || 'there';
  return {
    firstName,
    fullName,
    company: lead?.company || 'Your company',
    email: lead?.email || '',
  };
}
