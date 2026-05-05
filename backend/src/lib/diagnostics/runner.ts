import { prisma } from "@/lib/db";
import { SUITES, Suite, CheckStatus } from "./catalog";

export interface SuiteResult {
  suiteId: string;
  results: CheckStatus[];                      // per check, in order
  passCount: number;
  warnCount: number;
  failCount: number;
  messages: string[];                          // matches results length
}

export type Scope = "platform" | `module:${string}` | `suite:${string}`;

function suitesForScope(scope: Scope): Suite[] {
  if (scope === "platform") return SUITES;
  if (scope.startsWith("module:")) {
    const moduleId = scope.slice(7);
    return SUITES.filter((s) => s.moduleId === moduleId);
  }
  if (scope.startsWith("suite:")) {
    const suiteId = scope.slice(6);
    return SUITES.filter((s) => s.id === suiteId);
  }
  return [];
}

export async function executeSuites(suites: Suite[]): Promise<SuiteResult[]> {
  return Promise.all(
    suites.map(async (suite) => {
      const results: CheckStatus[] = [];
      const messages: string[] = [];
      let passCount = 0,
        warnCount = 0,
        failCount = 0;
      for (const check of suite.checks) {
        try {
          const r = await check.run();
          results.push(r.status);
          messages.push(r.message);
          if (r.status === "pass") passCount++;
          else if (r.status === "warn") warnCount++;
          else failCount++;
        } catch (err: any) {
          results.push("fail");
          messages.push(`Check threw: ${err.message}`);
          failCount++;
        }
      }
      return { suiteId: suite.id, results, passCount, warnCount, failCount, messages };
    }),
  );
}

export function calculateHealthScore(suites: Suite[], suiteResults: SuiteResult[]): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const suite of suites) {
    const result = suiteResults.find((r) => r.suiteId === suite.id);
    if (!result || result.results.length === 0) continue;
    const points = result.results.reduce(
      (acc, s) => acc + (s === "pass" ? 1 : s === "warn" ? 0.5 : 0),
      0,
    );
    weighted += (points / result.results.length) * suite.weight;
    totalWeight += suite.weight;
  }
  return totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;
}

export interface RunOutcome {
  runId: number;
  scope: Scope;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  totalChecks: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  healthScore: number;
  results: Record<string, CheckStatus>;             // "<suiteId>-<idx>" → status
  messages: Record<string, string>;                  // "<suiteId>-<idx>" → message
  suiteResults: SuiteResult[];
  suites: Suite[];                                   // suites that ran (for AI follow-up)
}

export async function runScope(scope: Scope, startedById: number | null): Promise<RunOutcome> {
  const suites = suitesForScope(scope);
  if (suites.length === 0) throw new Error(`No suites match scope: ${scope}`);

  const startedAt = new Date();
  const suiteResults = await executeSuites(suites);
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  let totalChecks = 0,
    passCount = 0,
    warnCount = 0,
    failCount = 0;
  const results: Record<string, CheckStatus> = {};
  const messages: Record<string, string> = {};
  for (const sr of suiteResults) {
    totalChecks += sr.results.length;
    passCount += sr.passCount;
    warnCount += sr.warnCount;
    failCount += sr.failCount;
    sr.results.forEach((s, i) => {
      results[`${sr.suiteId}-${i}`] = s;
      messages[`${sr.suiteId}-${i}`] = sr.messages[i];
    });
  }
  const healthScore = calculateHealthScore(suites, suiteResults);

  const persisted = await prisma.diagnosticRun.create({
    data: {
      scope,
      startedById,
      startedAt,
      completedAt,
      durationMs,
      totalChecks,
      passCount,
      warnCount,
      failCount,
      healthScore,
      results: results as any,
      findings: {} as any,
    },
  });

  return {
    runId: persisted.id,
    scope,
    startedAt,
    completedAt,
    durationMs,
    totalChecks,
    passCount,
    warnCount,
    failCount,
    healthScore,
    results,
    messages,
    suiteResults,
    suites,
  };
}
