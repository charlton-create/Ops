import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3 = new S3Client({ region: "us-west-2" });
const BUCKET = "cat-i-ops-attachments";
const REGION = "us-west-2";
const PUBLIC_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

/**
 * Process an uploaded HTML email template:
 * 1. Extract large base64 images → upload to S3 → replace with CDN URLs
 * 2. Strip VML/Office conditional blocks that Gmail renders as raw text
 * 3. Return cleaned HTML suitable for cross-client email delivery
 */
export async function processEmailHtml(rawHtml: string): Promise<string> {
  let html = rawHtml;

  // 1. Extract and replace base64 images (before stripping VML, so we catch all)
  html = await replaceBase64Images(html);

  // 2. Strip <!--[if mso]>...<![endif]--> blocks (VML that Gmail shows as text)
  html = html.replace(/<!--\[if\s+mso\]>[\s\S]*?<!\[endif\]-->/gi, "");

  // 3. Strip <!--[if !mso]><!-->...<![endif]--> wrappers (keep the content inside)
  html = html.replace(/<!--\[if\s+!mso\]><!-->/gi, "");
  html = html.replace(/<!--<!\[endif\]-->/gi, "");

  // 4. Remove orphaned VML/Office tags
  html = html.replace(/<xml>[\s\S]*?<\/xml>/gi, "");
  html = html.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, "");
  html = html.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, "");
  html = html.replace(/<v:[^>]*\/>/gi, "");

  const originalSize = rawHtml.length;
  const newSize = html.length;
  console.log(`[html-processor] Processed: ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB`);

  return html;
}

/**
 * Find all data:image/...;base64,... occurrences in the HTML string,
 * upload large ones (>10KB) to S3, and replace with CDN URLs.
 * Uses string splitting instead of regex to handle multi-MB base64 blobs.
 */
async function replaceBase64Images(html: string): Promise<string> {
  const marker = "data:image/";
  let result = "";
  let searchFrom = 0;

  while (true) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) {
      result += html.slice(searchFrom);
      break;
    }

    // Append everything before this marker
    result += html.slice(searchFrom, idx);

    // Find the quote/paren that opened this URL value (look back from idx)
    const charBefore = idx > 0 ? html[idx - 1] : "";
    const quoteChar = charBefore === "'" || charBefore === '"' ? charBefore : "";

    // Find ";base64," after the marker
    const base64Start = html.indexOf(";base64,", idx);
    if (base64Start === -1 || base64Start > idx + 50) {
      // Not a base64 data URL — keep as-is and move on
      result += marker;
      searchFrom = idx + marker.length;
      continue;
    }

    const dataStart = base64Start + 8; // after ";base64,"

    // Find the end of the base64 data — look for closing quote, paren, or whitespace
    let dataEnd = dataStart;
    while (dataEnd < html.length) {
      const ch = html[dataEnd];
      if (ch === "'" || ch === '"' || ch === ")" || ch === " " || ch === "\n" || ch === "\r" || ch === ";") break;
      dataEnd++;
    }

    const base64Data = html.slice(dataStart, dataEnd).replace(/\s/g, "");
    const ext = html.slice(idx + marker.length, base64Start).replace("jpg", "jpeg");

    // Only process images > 10KB of base64 data
    if (base64Data.length < 13000) {
      // Keep small images inline
      result += html.slice(idx, dataEnd);
      searchFrom = dataEnd;
      continue;
    }

    // Upload to S3
    try {
      const buffer = Buffer.from(base64Data, "base64");
      const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 12);
      const key = `email-images/${hash}.${ext || "png"}`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: `image/${ext || "png"}`,
        CacheControl: "public, max-age=31536000",
      }));

      const publicUrl = `${PUBLIC_BASE}/${key}`;
      console.log(`[html-processor] Uploaded ${key} (${(buffer.length / 1024).toFixed(0)} KB)`);

      // Replace the entire data URL with the CDN URL
      result += publicUrl;
      searchFrom = dataEnd;
    } catch (err) {
      console.error(`[html-processor] Failed to upload image:`, err);
      // Keep original on failure
      result += html.slice(idx, dataEnd);
      searchFrom = dataEnd;
    }
  }

  return result;
}
