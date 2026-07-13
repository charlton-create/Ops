import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api";
import { getCreds, suiteql, NsConfigError } from "@/lib/netsuite/client";
import { getDatasetQuery, isDataset } from "@/lib/netsuite/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/netsuite?dataset=bottling|straw|warehouse&start=YYYY-MM-DD&end=YYYY-MM-DD
 * Runs the dataset's SuiteQL via Token-Based Auth and returns rows shaped like the
 * dashboard's CSV templates: { dataset, count, data: [...] }.
 */
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dataset = (searchParams.get("dataset") || "bottling").toLowerCase();
  if (!isDataset(dataset)) {
    return NextResponse.json(
      { error: `Unknown dataset "${dataset}". Use bottling, straw, or warehouse.` },
      { status: 400 }
    );
  }

  const today = new Date();
  const start = searchParams.get("start") || ymd(new Date(today.getTime() - 90 * 86400000));
  const end = searchParams.get("end") || ymd(today);

  try {
    const creds = getCreds();
    const { sql, map } = getDatasetQuery(dataset, start, end);
    const rows = await suiteql(sql, creds);
    const data = rows.map(map);
    return NextResponse.json({
      dataset,
      source: "netsuite",
      range: { start, end },
      count: data.length,
      data,
    });
  } catch (e) {
    const err = e as Error;
    // Missing config -> 503 (not yet set up); upstream/query failure -> 502.
    const status = err instanceof NsConfigError ? 503 : 502;
    return NextResponse.json({ error: err.message, dataset }, { status });
  }
}
