import { prisma } from "@/lib/db";

export async function nextTicketNumber(): Promise<string> {
  const last = await prisma.ticket.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const next = (last?.id ?? 0) + 1;
  return `TKT-${String(next).padStart(4, "0")}`;
}

export const SLA_HOURS: Record<number, number> = { 1: 4, 2: 24, 3: 2 };

export function defaultQueueForLevel(level: number): string {
  if (level === 3) return "Dev Team Escalation";
  if (level === 2) return "Tier 2 Queue";
  return "AI Auto-Response";
}
