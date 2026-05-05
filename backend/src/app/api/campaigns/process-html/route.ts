import { requirePermission } from "@/lib/auth/api";
import { processEmailHtml } from "@/lib/email/html-processor";
import { NextRequest, NextResponse } from "next/server";

// POST — process uploaded HTML template (strip VML, upload base64 images to S3)
export async function POST(request: NextRequest) {
  const { error } = await requirePermission("content.edit");
  if (error) return error;

  const { html } = await request.json();
  if (!html || typeof html !== "string") {
    return NextResponse.json({ error: "html field is required" }, { status: 400 });
  }

  try {
    const processed = await processEmailHtml(html);
    return NextResponse.json({ html: processed });
  } catch (err: any) {
    console.error("[process-html] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
