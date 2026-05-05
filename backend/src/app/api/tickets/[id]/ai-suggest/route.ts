import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the CAT-I.AI Level 1 Customer Support assistant. CAT-I.AI is a food manufacturing compliance, quality management, and operational intelligence platform with the tagline "AUDIT-READY ALL THE TIME."

Modules: CAT-I Base (core compliance hub), CAT-MES (manufacturing execution), CAT-QT (quality & HACCP), CAT-SCAN (sanitation management), CAT-ALOG (label creation & compliance).

Your job is to draft a concise, professional reply a live CS agent can send to a customer. Be specific and practical. If the issue is a software bug, data loss, or technical error that is not a how-to question, recommend escalation to L2. Keep replies under 200 words unless a numbered procedure is required. Do not invent features that don't exist.`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("ai.use");
  if (error) return error;

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) },
    include: { notes: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      suggestion: "AI suggestions are not configured. Set ANTHROPIC_API_KEY on the backend to enable.",
      configured: false,
    });
  }

  const body = await request.json().catch(() => ({}));
  const userPrompt = body.prompt as string | undefined;

  const conversation = [
    `Module: ${ticket.module}`,
    `Category: ${ticket.category}`,
    `Subject: ${ticket.subject}`,
    `Description: ${ticket.description}`,
    "",
    "Conversation so far:",
    ...ticket.notes.map((n) => `[${n.visibility}] ${n.author}: ${n.content}`),
    userPrompt ? `\nAgent asks: ${userPrompt}` : "\nDraft an initial reply to the customer.",
  ].join("\n");

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
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: conversation }],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `AI request failed: ${text}` }, { status: 502 });
    }
    const data = await resp.json();
    const suggestion = data.content?.find((b: any) => b.type === "text")?.text ?? "";
    return NextResponse.json({ suggestion, configured: true });
  } catch (err: any) {
    console.error("AI suggest error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
