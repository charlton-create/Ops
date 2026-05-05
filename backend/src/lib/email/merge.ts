export interface MergeData {
  contact_name: string;
  company_name: string;
  from_name: string;
  from_email: string;
  from_role: string;
  body_content: string;
  cta_text?: string;
  cta_url?: string;
  image_url?: string;
}

export function interpolateMergeFields(template: string, data: MergeData): string {
  let html = template;

  // Replace simple merge fields
  html = html.replace(/\{\{contact_name\}\}/g, data.contact_name || "there");
  html = html.replace(/\{\{company_name\}\}/g, data.company_name || "");
  html = html.replace(/\{\{from_name\}\}/g, data.from_name || "CAT-I Team");
  html = html.replace(/\{\{from_email\}\}/g, data.from_email || "dev@cat-i.ai");
  html = html.replace(/\{\{from_role\}\}/g, data.from_role || "");
  html = html.replace(/\{\{body_content\}\}/g, data.body_content || "");

  // Replace CTA block
  if (data.cta_text && data.cta_url) {
    const ctaHtml = `<a href="${data.cta_url}" style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${data.cta_text}</a>`;
    html = html.replace(/\{\{cta_block\}\}/g, ctaHtml);
  } else {
    html = html.replace(/\{\{cta_block\}\}/g, "");
  }

  // Replace image block
  if (data.image_url) {
    const imgHtml = `<img src="${data.image_url}" alt="" style="max-width:100%;height:auto;border-radius:8px;" />`;
    html = html.replace(/\{\{image_block\}\}/g, imgHtml);
  } else {
    html = html.replace(/\{\{image_block\}\}/g, "");
  }

  return html;
}
