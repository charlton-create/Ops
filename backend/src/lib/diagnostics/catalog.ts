// Catalog of OPS-specific automated diagnostic probes.
// Each check has a `run()` function that performs a real probe and returns
// pass/warn/fail with a short message. No simulated/random results.

import { prisma } from "@/lib/db";

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  status: CheckStatus;
  message: string;
}

export interface Check {
  id: string;                    // unique within suite, e.g. "ping"
  name: string;                  // human-readable label
  run(): Promise<CheckResult>;
}

export interface Suite {
  id: string;                    // unique, e.g. "db-conn"
  moduleId: string;              // see DiagnosticModule list below
  name: string;
  category: string;              // free-form, e.g. "Infrastructure"
  weight: number;                // 1-10 — used in health score calculation
  checks: Check[];
}

export interface DiagnosticModule {
  id: string;
  name: string;
  icon: string;                  // emoji
  color: string;
  desc: string;
}

// ─── Modules ──────────────────────────────────────────────────────────────────
export const DIAGNOSTIC_MODULES: DiagnosticModule[] = [
  { id: "db",        name: "Database",            icon: "🗄",  color: "#1A56DB", desc: "PostgreSQL connectivity, schema, row counts" },
  { id: "auth",      name: "Auth & Security",     icon: "🔐", color: "#7C3AED", desc: "JWT secret, password hashes, admin coverage" },
  { id: "ai",        name: "AI Integration",      icon: "✨", color: "#0D9488", desc: "Anthropic API key, model availability" },
  { id: "storage",   name: "Storage (S3)",        icon: "📦", color: "#D97706", desc: "S3 bucket and AWS credentials" },
  { id: "email",     name: "Email (SES)",         icon: "📧", color: "#E11D48", desc: "SES region, sender configuration" },
  { id: "support",   name: "Support / Ticketing", icon: "🎫", color: "#0D9488", desc: "Ticketing settings, portal keys, SLA breaches" },
  { id: "projects",  name: "Project Hub",         icon: "📋", color: "#6366F1", desc: "Project + task + subtask integrity" },
  { id: "meetings",  name: "Meeting Repository",  icon: "🎙", color: "#39219F", desc: "Meeting state, stuck live recordings" },
  { id: "data",      name: "Data Integrity",      icon: "🔍", color: "#F59E0B", desc: "Orphan records, missing FKs, stale data" },
  { id: "config",    name: "Configuration",       icon: "⚙",  color: "#6B7280", desc: "Required env vars, runtime settings" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ok = (message: string): CheckResult => ({ status: "pass", message });
const warn = (message: string): CheckResult => ({ status: "warn", message });
const fail = (message: string): CheckResult => ({ status: "fail", message });

const envSet = (name: string): CheckResult => {
  const v = process.env[name];
  if (!v || !v.trim()) return fail(`${name} is not set`);
  return ok(`${name} is set (${v.length} chars)`);
};

// ─── Suites ───────────────────────────────────────────────────────────────────
export const SUITES: Suite[] = [
  {
    id: "db-conn",
    moduleId: "db",
    name: "Database Connectivity & Schema",
    category: "Infrastructure",
    weight: 10,
    checks: [
      {
        id: "ping",
        name: "PostgreSQL ping (SELECT 1)",
        async run() {
          try {
            const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
            return result?.[0]?.ok === 1 ? ok("Database responded") : fail("Unexpected response");
          } catch (err: any) {
            return fail(`Connection failed: ${err.message}`);
          }
        },
      },
      {
        id: "tables",
        name: "Core tables exist",
        async run() {
          try {
            const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
              SELECT table_name FROM information_schema.tables
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `;
            const expected = ["team_members", "app_users", "leads", "customers", "tickets", "hub_projects", "meetings", "diagnostic_runs"];
            const missing = expected.filter((t) => !rows.some((r) => r.table_name === t));
            return missing.length === 0
              ? ok(`${rows.length} tables found, all expected core tables present`)
              : fail(`Missing core tables: ${missing.join(", ")}`);
          } catch (err: any) {
            return fail(`Schema introspection failed: ${err.message}`);
          }
        },
      },
      {
        id: "team-seeded",
        name: "Team members seeded (≥1)",
        async run() {
          const count = await prisma.teamMember.count();
          if (count === 0) return fail("No team members in DB");
          if (count < 3) return warn(`Only ${count} team member(s) — expected several`);
          return ok(`${count} team members`);
        },
      },
      {
        id: "auth-users",
        name: "App users present (≥1)",
        async run() {
          const count = await prisma.appUser.count();
          return count === 0 ? fail("No app users — auth will fail for everyone") : ok(`${count} app users`);
        },
      },
    ],
  },

  {
    id: "auth-security",
    moduleId: "auth",
    name: "Auth Secret & Password Hashes",
    category: "Security",
    weight: 10,
    checks: [
      {
        id: "auth-secret",
        name: "AUTH_SECRET is set and ≥32 chars",
        async run() {
          const v = process.env.AUTH_SECRET;
          if (!v) return fail("AUTH_SECRET is not set — JWTs cannot be signed");
          if (v.length < 32) return fail(`AUTH_SECRET is only ${v.length} chars (recommend ≥32)`);
          return ok(`AUTH_SECRET is ${v.length} chars`);
        },
      },
      {
        id: "auth-secret-not-default",
        name: "AUTH_SECRET is not the dev default",
        async run() {
          const v = process.env.AUTH_SECRET || "";
          if (v === "" || v.includes("dev-secret") || v.includes("change-in-production")) {
            return fail("AUTH_SECRET is the development placeholder. Rotate before production.");
          }
          return ok("AUTH_SECRET is not the dev default");
        },
      },
      {
        id: "admin-exists",
        name: "At least one admin user exists",
        async run() {
          const count = await prisma.appUser.count({ where: { role: "admin" } });
          if (count === 0) return fail("No admin users — no one can access admin settings");
          return ok(`${count} admin user(s)`);
        },
      },
      {
        id: "password-hashes",
        name: "All passwords use bcrypt hashes",
        async run() {
          const all = await prisma.appUser.findMany({ select: { id: true, passwordHash: true, email: true } });
          const bad = all.filter((u) => !u.passwordHash || !/^\$2[aby]\$/.test(u.passwordHash));
          if (bad.length > 0) return fail(`${bad.length} user(s) without a valid bcrypt hash: ${bad.map((u) => u.email).join(", ")}`);
          return ok(`${all.length} users, all with bcrypt hashes`);
        },
      },
      {
        id: "active-admin",
        name: "At least one active admin",
        async run() {
          const count = await prisma.appUser.count({ where: { role: "admin", status: "active" } });
          if (count === 0) return warn("No active admin users — only pending/inactive admins exist");
          return ok(`${count} active admin(s)`);
        },
      },
    ],
  },

  {
    id: "ai-config",
    moduleId: "ai",
    name: "Anthropic AI Configuration",
    category: "Integration",
    weight: 7,
    checks: [
      {
        id: "ai-key-set",
        name: "ANTHROPIC_API_KEY is set",
        async run() {
          const v = process.env.ANTHROPIC_API_KEY;
          if (!v) return warn("ANTHROPIC_API_KEY not set — AI features will be disabled (degrade gracefully)");
          return ok(`Key configured (${v.length} chars)`);
        },
      },
      {
        id: "ai-key-format",
        name: "ANTHROPIC_API_KEY format looks valid",
        async run() {
          const v = process.env.ANTHROPIC_API_KEY;
          if (!v) return warn("Skipped — key not set");
          if (!v.startsWith("sk-ant-")) return fail("Key does not start with 'sk-ant-' — likely invalid");
          if (v.length < 50) return warn(`Key is only ${v.length} chars — usually 100+`);
          return ok("Key format looks valid");
        },
      },
      {
        id: "ai-reachable",
        name: "Anthropic API reachable",
        async run() {
          const v = process.env.ANTHROPIC_API_KEY;
          if (!v) return warn("Skipped — key not set");
          try {
            const resp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": v,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 5,
                messages: [{ role: "user", content: "ping" }],
              }),
            });
            if (resp.ok) return ok("API responded successfully");
            if (resp.status === 401) return fail("API rejected the key (401 Unauthorized)");
            return warn(`API returned HTTP ${resp.status}`);
          } catch (err: any) {
            return fail(`Network error: ${err.message}`);
          }
        },
      },
    ],
  },

  {
    id: "storage-s3",
    moduleId: "storage",
    name: "S3 Attachments Bucket",
    category: "Integration",
    weight: 5,
    checks: [
      {
        id: "s3-bucket-set",
        name: "S3_ATTACHMENTS_BUCKET is set",
        async run() {
          return envSet("S3_ATTACHMENTS_BUCKET");
        },
      },
      {
        id: "s3-region",
        name: "S3_REGION is set",
        async run() {
          const v = process.env.S3_REGION || "us-west-2";
          return ok(`Region: ${v}${process.env.S3_REGION ? "" : " (default)"}`);
        },
      },
      {
        id: "s3-creds",
        name: "AWS credentials reachable",
        async run() {
          const hasKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
          const hasProfile = !!process.env.AWS_PROFILE;
          if (!hasKeys && !hasProfile) {
            return warn("Neither AWS_ACCESS_KEY_ID nor AWS_PROFILE is set — uploads will fall back to linked-only mode");
          }
          return ok(hasKeys ? "Static credentials present" : `Profile: ${process.env.AWS_PROFILE}`);
        },
      },
    ],
  },

  {
    id: "email-ses",
    moduleId: "email",
    name: "SES Email Configuration",
    category: "Integration",
    weight: 6,
    checks: [
      {
        id: "ses-region",
        name: "SES_REGION is set",
        async run() {
          const v = process.env.SES_REGION || "us-east-1";
          return ok(`Region: ${v}${process.env.SES_REGION ? "" : " (default)"}`);
        },
      },
      {
        id: "ses-from",
        name: "SES_FROM_EMAIL is set",
        async run() {
          const v = process.env.SES_FROM_EMAIL || "dev@cat-i.ai";
          if (!process.env.SES_FROM_EMAIL) return warn(`Using default sender '${v}' — set SES_FROM_EMAIL for production`);
          return ok(`Sender: ${v}`);
        },
      },
      {
        id: "ses-creds",
        name: "AWS credentials present (shared with S3)",
        async run() {
          const hasKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
          const hasProfile = !!process.env.AWS_PROFILE;
          if (!hasKeys && !hasProfile) return warn("AWS credentials missing — outbound email will fail at runtime");
          return ok(hasKeys ? "Static credentials present" : "AWS profile in use");
        },
      },
    ],
  },

  {
    id: "support-health",
    moduleId: "support",
    name: "Ticketing System Health",
    category: "Operations",
    weight: 8,
    checks: [
      {
        id: "ticketing-settings",
        name: "TicketingSettings row initialized",
        async run() {
          const s = await prisma.ticketingSettings.findFirst();
          if (!s) return warn("TicketingSettings row not yet created — will auto-init on first GET");
          return ok("Settings row present");
        },
      },
      {
        id: "support-email",
        name: "Support email configured",
        async run() {
          const s = await prisma.ticketingSettings.findFirst();
          if (!s) return warn("Skipped — settings row missing");
          if (!s.supportEmail || !s.supportEmail.includes("@")) return fail(`Invalid support email: '${s.supportEmail}'`);
          return ok(`Support email: ${s.supportEmail}`);
        },
      },
      {
        id: "auto-reply-enabled",
        name: "Auto-reply on ticket creation enabled",
        async run() {
          const s = await prisma.ticketingSettings.findFirst();
          if (!s) return warn("Skipped — settings row missing");
          if (!s.autoReplyEnabled) return warn("Auto-reply is disabled — customers won't receive confirmations");
          if (!s.autoReplyTemplate?.includes("{{TICKET_ID}}")) return warn("Auto-reply template missing {{TICKET_ID}} variable");
          return ok("Auto-reply enabled with valid template");
        },
      },
      {
        id: "escalation-rules",
        name: "At least one escalation rule defined",
        async run() {
          const s = await prisma.ticketingSettings.findFirst();
          const rules = (s?.escalationRules as any[]) ?? [];
          if (rules.length === 0) return warn("No escalation rules — overdue tickets won't trigger reminders");
          const enabled = rules.filter((r) => r.enabled).length;
          if (enabled === 0) return warn(`${rules.length} rule(s) defined but none enabled`);
          return ok(`${enabled} of ${rules.length} rule(s) enabled`);
        },
      },
      {
        id: "portal-keys",
        name: "Customer portal API keys distribution",
        async run() {
          const total = await prisma.customer.count();
          if (total === 0) return ok("No customers yet — no keys needed");
          const withKey = await prisma.customer.count({ where: { portalApiKey: { not: null } } });
          if (withKey === 0) return warn(`0 of ${total} customers have a portal API key — external ticket submission disabled`);
          return ok(`${withKey} of ${total} customers have a portal key`);
        },
      },
      {
        id: "sla-breaches",
        name: "Open tickets past SLA",
        async run() {
          const open = await prisma.ticket.findMany({
            where: { status: { in: ["open", "in-progress", "escalated"] } },
            select: { id: true, level: true, createdAt: true, ticketNumber: true },
          });
          const slaHours: Record<number, number> = { 1: 4, 2: 24, 3: 2 };
          const now = Date.now();
          const breached = open.filter((t) => (now - t.createdAt.getTime()) / 3_600_000 > (slaHours[t.level] ?? 24));
          if (breached.length === 0) return ok(`${open.length} open ticket(s), none past SLA`);
          if (breached.length > 5) return fail(`${breached.length} of ${open.length} open tickets are past SLA`);
          return warn(`${breached.length} of ${open.length} open tickets are past SLA: ${breached.map((t) => t.ticketNumber).join(", ")}`);
        },
      },
    ],
  },

  {
    id: "projects-health",
    moduleId: "projects",
    name: "Project Hub Integrity",
    category: "Operations",
    weight: 7,
    checks: [
      {
        id: "projects-have-tasks",
        name: "Projects have at least one task",
        async run() {
          const projects = await prisma.hubProject.findMany({
            where: { status: { not: "completed" } },
            include: { _count: { select: { tasks: true } } },
          });
          const empty = projects.filter((p) => p._count.tasks === 0);
          if (empty.length === 0) return ok(`${projects.length} active project(s), all have tasks`);
          if (empty.length > projects.length / 2) return fail(`${empty.length} of ${projects.length} active projects have zero tasks`);
          return warn(`${empty.length} active project(s) have zero tasks: ${empty.map((p) => p.name).slice(0, 3).join(", ")}`);
        },
      },
      {
        id: "tasks-have-raci",
        name: "Tasks have Responsible & Accountable assigned",
        async run() {
          const tasks = await prisma.hubTask.findMany({
            select: { id: true, title: true, responsible: true, accountable: true },
          });
          const missing = tasks.filter((t) => !t.responsible?.trim() || !t.accountable?.trim());
          if (tasks.length === 0) return ok("No tasks to check");
          if (missing.length === 0) return ok(`${tasks.length} task(s), all have RACI`);
          return warn(`${missing.length} of ${tasks.length} task(s) missing R or A`);
        },
      },
      {
        id: "overdue-projects",
        name: "Projects past target date",
        async run() {
          const overdue = await prisma.hubProject.count({
            where: {
              status: { not: "completed" },
              targetDate: { lt: new Date() },
            },
          });
          if (overdue === 0) return ok("No overdue projects");
          if (overdue > 5) return fail(`${overdue} project(s) past target date`);
          return warn(`${overdue} project(s) past target date`);
        },
      },
      {
        id: "phase-distribution",
        name: "Project phase distribution looks healthy",
        async run() {
          const counts = await prisma.hubProject.groupBy({
            by: ["currentPhase"],
            where: { status: { not: "completed" } },
            _count: true,
          });
          if (counts.length === 0) return ok("No active projects");
          const stuckInM = counts.find((c) => c.currentPhase === "M")?._count ?? 0;
          const total = counts.reduce((s, c) => s + c._count, 0);
          if (total > 3 && stuckInM === total) return warn(`All ${total} projects still in M phase — none have advanced`);
          return ok(`${total} active project(s) across ${counts.length} phase(s)`);
        },
      },
    ],
  },

  {
    id: "meetings-health",
    moduleId: "meetings",
    name: "Meeting Repository Health",
    category: "Operations",
    weight: 5,
    checks: [
      {
        id: "stuck-live",
        name: "No meetings stuck in live state",
        async run() {
          const cutoff = new Date(Date.now() - 24 * 3_600_000);
          const stuck = await prisma.meeting.findMany({
            where: { status: "live", date: { lt: cutoff } },
            select: { id: true, title: true },
          });
          if (stuck.length === 0) return ok("No stuck live meetings");
          return warn(`${stuck.length} meeting(s) live for >24h: ${stuck.map((m) => m.title).slice(0, 3).join(", ")}`);
        },
      },
      {
        id: "transcript-coverage",
        name: "Completed meetings have transcripts",
        async run() {
          const completed = await prisma.meeting.findMany({
            where: { status: "completed" },
            select: { id: true, transcript: true, imported: true },
          });
          if (completed.length === 0) return ok("No completed meetings yet");
          const empty = completed.filter((m) => !m.transcript || m.transcript.trim().length < 10).length;
          if (empty > completed.length / 2) return warn(`${empty} of ${completed.length} completed meetings have minimal/no transcript`);
          return ok(`${completed.length} completed, ${completed.length - empty} with substantial transcript`);
        },
      },
    ],
  },

  {
    id: "data-integrity",
    moduleId: "data",
    name: "Cross-Table Data Integrity",
    category: "Data Quality",
    weight: 9,
    checks: [
      {
        id: "leads-with-owner",
        name: "Leads have valid owner FK",
        async run() {
          const orphaned = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint as count FROM leads l
            LEFT JOIN team_members t ON t.id = l."ownerId"
            WHERE t.id IS NULL
          `;
          const n = Number(orphaned[0]?.count ?? 0);
          if (n === 0) return ok("All leads have valid owner");
          return fail(`${n} lead(s) point to a missing TeamMember`);
        },
      },
      {
        id: "tickets-customer-or-fallback",
        name: "Tickets have customer FK or freeform company",
        async run() {
          const bad = await prisma.ticket.count({
            where: { customerId: null, customerCompany: "" },
          });
          if (bad === 0) return ok("All tickets identify a customer");
          return fail(`${bad} ticket(s) have no customer linkage`);
        },
      },
      {
        id: "no-empty-titles",
        name: "Core records have non-empty titles/names",
        async run() {
          const issues: string[] = [];
          const projects = await prisma.hubProject.count({ where: { name: "" } });
          if (projects > 0) issues.push(`${projects} project(s) with blank name`);
          const meetings = await prisma.meeting.count({ where: { title: "" } });
          if (meetings > 0) issues.push(`${meetings} meeting(s) with blank title`);
          if (issues.length === 0) return ok("All core records have titles");
          return fail(issues.join("; "));
        },
      },
      {
        id: "activity-log-active",
        name: "Activity log shows recent writes",
        async run() {
          const cutoff = new Date(Date.now() - 30 * 24 * 3_600_000);
          const recent = await prisma.activity.count({ where: { createdAt: { gt: cutoff } } });
          if (recent === 0) return warn("No activity in the last 30 days — logging may be broken or system idle");
          return ok(`${recent} activities in last 30 days`);
        },
      },
    ],
  },

  {
    id: "config-env",
    moduleId: "config",
    name: "Required Environment Variables",
    category: "Configuration",
    weight: 8,
    checks: [
      { id: "database-url",     name: "DATABASE_URL set",     async run() { return envSet("DATABASE_URL"); } },
      { id: "auth-url",         name: "AUTH_URL set",         async run() { return envSet("AUTH_URL"); } },
      { id: "frontend-url",     name: "FRONTEND_URL set",     async run() {
        const v = process.env.FRONTEND_URL;
        if (!v) return warn("FRONTEND_URL not set — CORS config falls back to defaults");
        return ok(`FRONTEND_URL: ${v}`);
      } },
      {
        id: "node-version",
        name: "Node.js version (≥22)",
        async run() {
          const major = parseInt(process.versions.node.split(".")[0], 10);
          if (major < 22) return fail(`Node ${process.versions.node} — README requires ≥22`);
          return ok(`Node ${process.versions.node}`);
        },
      },
    ],
  },
];
