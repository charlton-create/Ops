// AI helpers for the Meeting Repository.
// Calls Anthropic with a server-side ANTHROPIC_API_KEY so the key is never exposed
// to the browser. Returns null when AI is not configured so the caller can fall
// back to raw notes.

interface MeetingContext {
  title: string;
  date: string | Date;
  attendees: string[];
  agenda: string[];
}

export interface MeetingAISummary {
  summary: string;
  discussion: string;
  actionItems: { task: string; owner: string; dueDate: string }[];
  followUpTasks: { task: string; context: string }[];
}

const MIN_TRANSCRIPT_WORDS = 10;

function fillSummaryPrompt(ctx: MeetingContext, transcript: string, mode: "live" | "import"): string {
  const meta = [
    `- Title: ${ctx.title}`,
    `- Date: ${new Date(ctx.date).toLocaleString()}`,
    `- Attendees: ${ctx.attendees.length ? ctx.attendees.join(", ") : "Not recorded"}`,
    `- Agenda: ${ctx.agenda.length ? ctx.agenda.map((a, i) => `${i + 1}. ${a}`).join(" | ") : "No agenda set"}`,
  ].join("\n");

  if (mode === "live") {
    return `You are summarizing a CAT-I.AI team meeting. Analyze the raw voice transcript and produce a structured meeting record.

MEETING METADATA:
${meta}

RAW TRANSCRIPT:
${transcript}

Return ONLY a valid JSON object (no markdown, no preamble, no code fences) with this exact shape:

{
  "summary": "2-3 sentence executive summary of what the meeting accomplished and key outcomes",
  "discussion": "Cleaned-up, well-organized discussion notes in paragraph form. Fix transcription errors, organize topics, remove filler. 3-6 paragraphs typical.",
  "actionItems": [
    { "task": "specific action to be taken", "owner": "person responsible or 'Unassigned'", "dueDate": "due date if mentioned, else empty string" }
  ],
  "followUpTasks": [
    { "task": "follow-up item or open question to revisit", "context": "brief context or why it matters" }
  ]
}

Rules:
- Action items are concrete, near-term tasks committed to in the meeting
- Follow-up tasks are open questions, deferred decisions, or items to revisit later
- If the transcript is sparse or unclear, return shorter sections rather than fabricating content
- Owner names should match attendees when possible`;
  }

  return `You are organizing pre-existing meeting notes from a past CAT-I.AI team meeting into a structured record. The source material may be informal notes, a typed-up summary, an email recap, or a transcript.

MEETING METADATA:
${meta}

SOURCE CONTENT:
${transcript}

Return ONLY a valid JSON object (no markdown, no preamble, no code fences) with this exact shape:

{
  "summary": "2-3 sentence executive summary of what the meeting accomplished and key outcomes",
  "discussion": "Cleaned-up, well-organized discussion notes in paragraph form. Preserve all factual content, organize by topic, remove obvious filler. 3-6 paragraphs typical.",
  "actionItems": [
    { "task": "specific action to be taken", "owner": "person responsible or 'Unassigned'", "dueDate": "due date if mentioned, else empty string" }
  ],
  "followUpTasks": [
    { "task": "follow-up item or open question to revisit", "context": "brief context or why it matters" }
  ]
}

Rules:
- Action items are concrete tasks committed to in the meeting
- Follow-up tasks are open questions, deferred decisions, or items to revisit later
- Preserve the substance of the source — do not fabricate facts, decisions, or attributions
- If the source already contains structured sections (e.g., "Action Items:"), preserve and enhance them rather than rewriting
- Owner names should match attendees when possible
- If the source is sparse, return shorter sections rather than padding`;
}

function extractJson(text: string): MeetingAISummary {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonStr);
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    discussion: typeof parsed.discussion === "string" ? parsed.discussion : "",
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.map((a: any) => ({
          task: String(a.task ?? ""),
          owner: String(a.owner ?? ""),
          dueDate: String(a.dueDate ?? ""),
        }))
      : [],
    followUpTasks: Array.isArray(parsed.followUpTasks)
      ? parsed.followUpTasks.map((f: any) => ({
          task: String(f.task ?? ""),
          context: String(f.context ?? ""),
        }))
      : [],
  };
}

export async function summarizeMeeting(
  ctx: MeetingContext,
  transcript: string,
  mode: "live" | "import" = "live",
): Promise<MeetingAISummary | { unavailable: true; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { unavailable: true, reason: "ANTHROPIC_API_KEY not configured on the backend." };

  const cleaned = (transcript || "").trim();
  if (mode === "live" && cleaned.split(/\s+/).filter(Boolean).length < MIN_TRANSCRIPT_WORDS) {
    return {
      summary: "Meeting ended with insufficient transcript content for AI analysis.",
      discussion: cleaned || "No transcript captured.",
      actionItems: [],
      followUpTasks: [],
    };
  }

  const prompt = fillSummaryPrompt(ctx, cleaned, mode);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI request failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") ?? "";
  return extractJson(text);
}
