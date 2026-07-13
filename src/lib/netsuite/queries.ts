/**
 * Dataset -> SuiteQL query + row mapper for the Eagle KPI dashboard.
 *
 * Derived from Eagle_KPI_NetSuite_SavedSearch_Build_Guide.md. The SQL below is a
 * STARTING POINT — anywhere marked /* VERIFY *\/ is account-specific (which field
 * carries the production line, how expected dates are reached, item filters to
 * split bottling vs straw). Confirm those against your account, OR — the easy path —
 * paste a verified SuiteQL string into the matching env var and skip editing code:
 *
 *   NETSUITE_SQL_BOTTLING, NETSUITE_SQL_STRAW, NETSUITE_SQL_WAREHOUSE
 *
 * Use the literal tokens {start} and {end} (YYYY-MM-DD) in env SQL; they are
 * substituted at request time.
 *
 * NetSuite cannot source OEE inputs (downtime, run/ideal rates, quality, labor) —
 * those stay blank and the OEE/throughput/pick tiles remain "pending MES".
 */

export type Dataset = "bottling" | "straw" | "warehouse";

export interface DatasetQuery {
  sql: string;
  map: (r: Record<string, unknown>) => Record<string, unknown>;
}

const LINE = process.env.NETSUITE_LINE_FIELD || "tl.class"; // /* VERIFY */ class | department | location | custcol_...
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[, ]/g, ""));
  return isFinite(n) ? n : 0;
};

function fill(sql: string, start: string, end: string): string {
  return sql.replace(/\{start\}/g, start).replace(/\{end\}/g, end);
}

// ── Report 1: Production Output (Assembly Builds, finished-good line) ──
const BOTTLING_SQL = `
SELECT TO_CHAR(t.trandate, 'YYYY-MM-DD') AS "date",
       BUILTIN.DF(${LINE}) AS "line",
       SUM(tl.quantity) AS "total_units"
FROM transaction t
INNER JOIN transactionline tl ON tl.transaction = t.id
WHERE t.type = 'Build'
  AND tl.mainline = 'T'
  AND t.trandate BETWEEN TO_DATE('{start}', 'YYYY-MM-DD') AND TO_DATE('{end}', 'YYYY-MM-DD')
  -- AND ${LINE} IN (/* VERIFY: bottling finished-good class/dept ids */)
GROUP BY t.trandate, BUILTIN.DF(${LINE})
ORDER BY 1`;

// ── Report 1 + 2: Straw output + resin consumption from a single build search ──
const STRAW_SQL = `
SELECT TO_CHAR(t.trandate, 'YYYY-MM-DD') AS "date",
       BUILTIN.DF(${LINE}) AS "line",
       SUM(CASE WHEN tl.mainline = 'T' THEN tl.quantity ELSE 0 END) AS "total_units",
       SUM(CASE WHEN tl.mainline = 'F' THEN ABS(tl.quantity) ELSE 0 END) AS "resin_used_kg"
FROM transaction t
INNER JOIN transactionline tl ON tl.transaction = t.id
WHERE t.type = 'Build'
  AND t.trandate BETWEEN TO_DATE('{start}', 'YYYY-MM-DD') AND TO_DATE('{end}', 'YYYY-MM-DD')
  -- AND ${LINE} IN (/* VERIFY: straw finished-good class/dept ids */)
GROUP BY t.trandate, BUILTIN.DF(${LINE})
ORDER BY 1`;
// resin_std_kg is not cleanly pullable here — fold in the per-unit BOM standard per SKU.
// See guide Report 2. Until then resin_std_kg is omitted (Material Yield tile pending).

// ── Reports 3 + 4: Receiving + Shipping, daily grain ──
// On-time logic needs the expected date, which usually lives on the source PO/SO line
// and may require a join /* VERIFY */. This default counts volume; refine on-time once
// the expected-date field is confirmed (or supply NETSUITE_SQL_WAREHOUSE).
const WAREHOUSE_SQL = `
SELECT d AS "date",
       SUM(receipts_total) AS "receipts_total",
       SUM(receipts_on_time) AS "receipts_on_time",
       SUM(shipments_total) AS "shipments_total",
       SUM(shipments_on_time) AS "shipments_on_time"
FROM (
  SELECT TO_CHAR(t.trandate, 'YYYY-MM-DD') AS d,
         COUNT(t.id) AS receipts_total,
         0 AS receipts_on_time,            -- /* VERIFY */ SUM(CASE WHEN t.trandate <= <expected receipt date> THEN 1 ELSE 0 END)
         0 AS shipments_total,
         0 AS shipments_on_time
  FROM transaction t
  WHERE t.type = 'ItemRcpt' AND t.mainline = 'T'
    AND t.trandate BETWEEN TO_DATE('{start}', 'YYYY-MM-DD') AND TO_DATE('{end}', 'YYYY-MM-DD')
  GROUP BY TO_CHAR(t.trandate, 'YYYY-MM-DD')
  UNION ALL
  SELECT TO_CHAR(t.trandate, 'YYYY-MM-DD') AS d,
         0, 0,
         COUNT(t.id) AS shipments_total,
         0 AS shipments_on_time            -- /* VERIFY */ SUM(CASE WHEN t.trandate <= <expected ship date> THEN 1 ELSE 0 END)
  FROM transaction t
  WHERE t.type = 'ItemShip' AND t.mainline = 'T'
    AND t.trandate BETWEEN TO_DATE('{start}', 'YYYY-MM-DD') AND TO_DATE('{end}', 'YYYY-MM-DD')
  GROUP BY TO_CHAR(t.trandate, 'YYYY-MM-DD')
)
GROUP BY d
ORDER BY d`;

const DEFAULTS: Record<Dataset, DatasetQuery> = {
  bottling: {
    sql: BOTTLING_SQL,
    map: (r) => ({ date: r.date, line: r.line, total_units: num(r.total_units) }),
  },
  straw: {
    sql: STRAW_SQL,
    map: (r) => ({
      date: r.date,
      line: r.line,
      total_units: num(r.total_units),
      resin_used_kg: num(r.resin_used_kg),
    }),
  },
  warehouse: {
    sql: WAREHOUSE_SQL,
    map: (r) => ({
      date: r.date,
      receipts_total: num(r.receipts_total),
      receipts_on_time: num(r.receipts_on_time),
      shipments_total: num(r.shipments_total),
      shipments_on_time: num(r.shipments_on_time),
    }),
  },
};

const ENV_KEYS: Record<Dataset, string> = {
  bottling: "NETSUITE_SQL_BOTTLING",
  straw: "NETSUITE_SQL_STRAW",
  warehouse: "NETSUITE_SQL_WAREHOUSE",
};

export function isDataset(v: string): v is Dataset {
  return v === "bottling" || v === "straw" || v === "warehouse";
}

/** Resolve a dataset to a runnable SuiteQL string + mapper for the given date range. */
export function getDatasetQuery(dataset: Dataset, start: string, end: string): DatasetQuery {
  const override = process.env[ENV_KEYS[dataset]];
  const base = DEFAULTS[dataset];
  return { sql: fill(override || base.sql, start, end), map: base.map };
}
