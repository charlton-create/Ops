// Generates AI audit findings for a single suite's results.
// Server-side proxy to Anthropic — full schema preserved from the side project,
// reframed for OPS / SaaS platform context (replacing food-manufacturing audit).

import { Suite, CheckStatus } from "./catalog";

export interface AIFinding {
  severity: "critical" | "major" | "minor" | "observation";
  finding: string;
  risk_area: "infrastructure" | "security" | "data_integrity" | "configuration" | "operations";
  regulatory_refs: string[];
  recommendation: string;
  root_cause: string | null;
  impact_analysis: string | null;
  failed_checks_detail: { check: string; why_it_matters: string; fix: string }[];
  remediation_plan: { immediate: string; short_term: string; long_term: string } | null;
  compliance_risk: string | null;
  estimated_effort: "low" | "medium" | "high" | null;
}

const SYSTEM_PROMPT = `You are an expert site reliability and platform-health auditor for cat-i-ops, the internal operations platform for CAT-I.AI. You produce thorough, actionable findings grounded in software engineering, security, data integrity, and SaaS operations best practices (SOC 2, OWASP, 12-Factor App, ISO 27001).

Respond ONLY in JSON, no markdown fences. Use this schema:
{
  "severity": "critical|major|minor|observation",
  "finding": "concise summary of the finding",
  "risk_area": "infrastructure|security|data_integrity|configuration|operations",
  "regulatory_refs": ["list of applicable standards or best practices"],
  "recommendation": "primary recommended action",
  "root_cause": "likely root cause analysis (only for critical/major, null otherwise)",
  "impact_analysis": "what business/operational impact this poses if unresolved (only for critical/major, null otherwise)",
  "failed_checks_detail": [{"check":"failed check label","why_it_matters":"why this failure is significant","fix":"concrete remediation step"}],
  "remediation_plan": {"immediate":"action within 24-48 hours","short_term":"action within 1-2 weeks","long_term":"systemic improvement within 30-90 days"} (only for critical/major, null otherwise),
  "compliance_risk": "specific operational risk — e.g. data exposure, downtime, audit finding (only for critical/major, null otherwise)",
  "estimated_effort": "low|medium|high (only for critical/major, null otherwise)"
}

For minor/observation findings: set root_cause, impact_analysis, remediation_plan, compliance_risk, and estimated_effort to null, and failed_checks_detail to an empty array.
For critical/major findings: ALWAYS populate ALL fields with specific, actionable, OPS-platform-relevant detail. Never leave them null.`;

function fallbackFinding(
  suite: Suite,
  results: CheckStatus[],
  messages: string[],
): AIFinding {
  const failed = suite.checks
    .map((c, i) => ({ name: c.name, status: results[i], msg: messages[i] }))
    .filter((c) => c.status === "fail");
  const warned = suite.checks
    .map((c, i) => ({ name: c.name, status: results[i], msg: messages[i] }))
    .filter((c) => c.status === "warn");
  const isCritMaj = failed.length >= 2;
  const severity =
    failed.length >= 2 ? "major" : failed.length > 0 ? "minor" : warned.length > 0 ? "observation" : "observation";
  const fcd = failed.map((f) => ({
    check: f.name,
    why_it_matters: "This automated probe validates a runtime-critical aspect of the OPS platform. A failure indicates the system is in a degraded state.",
    fix: f.msg
      ? `${f.msg}. Investigate and remediate before next deployment.`
      : "Review the underlying configuration or environment variable, verify connectivity, and re-test.",
  }));
  return {
    severity,
    finding: `${failed.length} check(s) failed and ${warned.length} warning(s) in ${suite.name}.`,
    risk_area:
      suite.moduleId === "auth"
        ? "security"
        : suite.moduleId === "data"
          ? "data_integrity"
          : suite.moduleId === "config"
            ? "configuration"
            : suite.moduleId === "db" || suite.moduleId === "storage" || suite.moduleId === "email" || suite.moduleId === "ai"
              ? "infrastructure"
              : "operations",
    regulatory_refs: ["SOC 2", "OWASP", "12-Factor App"],
    recommendation: isCritMaj
      ? "Triage the failed probes, fix the underlying configuration, and re-run this suite before continuing."
      : "Review the warnings and confirm whether each is expected.",
    root_cause: isCritMaj
      ? "Multiple failed probes in the same suite usually indicate a missing or misconfigured environment variable, an outdated migration, or a downstream service that is unreachable from this deployment."
      : null,
    impact_analysis: isCritMaj
      ? "If unresolved, dependent OPS features will degrade silently — affecting user-facing flows like authentication, ticket creation, AI summaries, or file uploads."
      : null,
    failed_checks_detail: fcd,
    remediation_plan: isCritMaj
      ? {
          immediate: "Identify the root configuration gap and fix in this environment within 24 hours.",
          short_term: "Add the missing variables/secrets to the deployment manifest and document expected values in the runbook within 1 week.",
          long_term: "Wire this diagnostics suite into a pre-deploy CI step so regressions are caught before merge within 60 days.",
        }
      : null,
    compliance_risk: isCritMaj
      ? "Operational reliability risk; potential SOC 2 control failure if probes touch auth, data integrity, or audit logging."
      : null,
    estimated_effort: isCritMaj ? "low" : null,
  };
}

export async function generateFinding(
  suite: Suite,
  results: CheckStatus[],
  messages: string[],
): Promise<AIFinding> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackFinding(suite, results, messages);

  const passCount = results.filter((r) => r === "pass").length;
  const warnCount = results.filter((r) => r === "warn").length;
  const failCount = results.filter((r) => r === "fail").length;

  const detail = suite.checks
    .map((c, i) => `- [${(results[i] || "PENDING").toUpperCase()}] ${c.name} :: ${messages[i] ?? ""}`)
    .join("\n");
  const failedChecks = suite.checks.filter((_, i) => results[i] === "fail");
  const warnChecks = suite.checks.filter((_, i) => results[i] === "warn");

  const userContent = `Suite: ${suite.name}
Module: ${suite.moduleId}
Category: ${suite.category}
Results: ${passCount} pass, ${failCount} fail, ${warnCount} warn

Failed checks:
${failedChecks.map((c) => `- ${c.name}`).join("\n") || "(none)"}

Warning checks:
${warnChecks.map((c) => `- ${c.name}`).join("\n") || "(none)"}

Full results with probe messages:
${detail}

Provide your detailed audit finding for this OPS platform suite.`;

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
        max_tokens: 1800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!resp.ok) throw new Error(`Anthropic returned ${resp.status}`);
    const data = await resp.json();
    const text =
      data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") ?? "";
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn("[diagnostics ai] falling back:", (err as Error).message);
    return fallbackFinding(suite, results, messages);
  }
}
