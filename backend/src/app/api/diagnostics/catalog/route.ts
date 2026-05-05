import { requirePermission } from "@/lib/auth/api";
import { DIAGNOSTIC_MODULES, SUITES } from "@/lib/diagnostics/catalog";
import { NextResponse } from "next/server";

// Returns the static catalog of modules + suites + checks (without the run() fn).
// Frontend uses this to render the suite list before any run has happened.
export async function GET() {
  const { error } = await requirePermission("diagnostics.view");
  if (error) return error;

  const suites = SUITES.map((s) => ({
    id: s.id,
    moduleId: s.moduleId,
    name: s.name,
    category: s.category,
    weight: s.weight,
    checks: s.checks.map((c) => ({ id: c.id, name: c.name })),
  }));
  return NextResponse.json({ modules: DIAGNOSTIC_MODULES, suites });
}
