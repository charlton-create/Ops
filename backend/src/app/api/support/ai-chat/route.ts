import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the CAT-I.AI Level 1 Customer Support assistant. CAT-I.AI is a food manufacturing compliance, quality management, and operational intelligence platform with the tagline "AUDIT-READY ALL THE TIME."

Modules: CAT-I Base (core compliance hub), CAT-MES (manufacturing execution), CAT-QT (quality & HACCP), CAT-SCAN (sanitation management), CAT-ALOG (label creation & compliance).

Your role is to help a live CS agent answer training, how-to, navigation, and feature questions. Be concise and practical. If the customer's issue is a software bug, data loss, or technical error, recommend escalation to L2. Keep replies under 200 words unless a numbered procedure is required.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("ai.use");
  if (error) return error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "AI is not configured on the backend. Set ANTHROPIC_API_KEY to enable.",
      configured: false,
    });
  }

  const body = await request.json();
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return NextResponse.json({ error: "No messages" }, { status: 400 });

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `AI request failed: ${text}` }, { status: 502 });
    }
    const data = await resp.json();
    const reply = data.content?.find((b: any) => b.type === "text")?.text ?? "";
    return NextResponse.json({ reply, configured: true });
  } catch (err: any) {
    console.error("AI chat error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
