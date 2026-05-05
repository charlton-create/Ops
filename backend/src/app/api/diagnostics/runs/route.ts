import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { runScope, Scope } from "@/lib/diagnostics/runner";
import { generateFinding } from "@/lib/diagnostics/ai";
import { NextRequest, NextResponse } from "next/server";

// GET — list recent runs (history)
export async function GET(request: NextRequest) {
  const { error } = await requirePermission("diagnostics.view");
  if (error) return error;

  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20");
  const runs = await prisma.diagnosticRun.findMany({
    take: Math.min(Math.max(limit, 1), 100),
    orderBy: { startedAt: "desc" },
    include: { startedBy: { select: { id: true, name: true } } },
  });
  return NextResponse.json(
    runs.map((r) => ({
      ...r,
      startedByName: r.startedBy?.name ?? null,
    })),
  );
}

// POST — execute a run for a given scope, optionally with AI findings
export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission("diagnostics.run");
  if (error) return error;

  try {
    const body = await request.json();
    const scope: Scope = body.scope ?? "platform";
    const includeAi: boolean = body.includeAi !== false;

    const userId = session?.user.id ? parseInt(session.user.id as string) : null;
    const startedById = isNaN(userId as number) ? null : userId;

    const outcome = await runScope(scope, startedById);

    // Generate AI findings per suite (concurrent)
    const findings: Record<string, any> = {};
    if (includeAi) {
      const aiResults = await Promise.allSettled(
        outcome.suiteResults.map(async (sr) => {
          const suite = outcome.suites.find((s) => s.id === sr.suiteId)!;
          const finding = await generateFinding(suite, sr.results, sr.messages);
          return { suiteId: sr.suiteId, finding };
        }),
      );
      for (const r of aiResults) {
        if (r.status === "fulfilled") findings[r.value.suiteId] = r.value.finding;
      }
      // Persist findings on the run
      await prisma.diagnosticRun.update({
        where: { id: outcome.runId },
        data: { findings: findings as any },
      });
    }

    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: "ran diagnostics",
        target: scope,
        detail: `Health: ${outcome.healthScore}% · ${outcome.passCount}P/${outcome.warnCount}W/${outcome.failCount}F`,
        type: "diagnostics",
      },
    });

    return NextResponse.json({
      runId: outcome.runId,
      scope: outcome.scope,
      startedAt: outcome.startedAt,
      completedAt: outcome.completedAt,
      durationMs: outcome.durationMs,
      totalChecks: outcome.totalChecks,
      passCount: outcome.passCount,
      warnCount: outcome.warnCount,
      failCount: outcome.failCount,
      healthScore: outcome.healthScore,
      results: outcome.results,
      messages: outcome.messages,
      findings,
    });
  } catch (err: any) {
    console.error("POST /api/diagnostics/runs error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
