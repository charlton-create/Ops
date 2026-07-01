// Vercel serverless function — NetSuite SuiteQL proxy for the Eagle KPI dashboard.
// Signs OAuth 1.0a (TBA) server-side so credentials stay in Vercel env vars and the
// browser never sees them / hits CORS. GET /api/netsuite?dataset=bottling|straw|warehouse
const crypto = require("crypto");

function rfc3986(s) {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}
function accountHost(a) {
  return a.toLowerCase().replace(/_/g, "-");
}
function suiteqlUrl(a) {
  return `https://${accountHost(a)}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
}

function getCreds() {
  const c = {
    account: process.env.NETSUITE_ACCOUNT_ID,
    consumerKey: process.env.NETSUITE_CONSUMER_KEY,
    consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
    tokenId: process.env.NETSUITE_TOKEN_ID,
    tokenSecret: process.env.NETSUITE_TOKEN_SECRET,
  };
  const missing = Object.entries({
    NETSUITE_ACCOUNT_ID: c.account,
    NETSUITE_CONSUMER_KEY: c.consumerKey,
    NETSUITE_CONSUMER_SECRET: c.consumerSecret,
    NETSUITE_TOKEN_ID: c.tokenId,
    NETSUITE_TOKEN_SECRET: c.tokenSecret,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new Error("missing env var(s): " + missing.join(", "));
  return c;
}

function oauthHeader(method, baseUrl, creds, extra) {
  const oauth = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.tokenId,
    oauth_version: "1.0",
  };
  const all = Object.assign({}, oauth, extra || {});
  const paramString = Object.keys(all)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(all[k])}`)
    .join("&");
  const baseString = [method.toUpperCase(), rfc3986(baseUrl), rfc3986(paramString)].join("&");
  const signingKey = `${rfc3986(creds.consumerSecret)}&${rfc3986(creds.tokenSecret)}`;
  const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");
  const header = Object.assign({}, oauth, { oauth_signature: signature });
  return (
    `OAuth realm="${rfc3986(creds.account)}", ` +
    Object.keys(header)
      .sort()
      .map((k) => `${rfc3986(k)}="${rfc3986(header[k])}"`)
      .join(", ")
  );
}

async function suiteql(q, creds, pageSize = 1000, maxPages = 20) {
  const baseUrl = suiteqlUrl(creds.account);
  const rows = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    const url = `${baseUrl}?limit=${pageSize}&offset=${offset}`;
    const auth = oauthHeader("POST", baseUrl, creds, { limit: String(pageSize), offset: String(offset) });
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Prefer: "transient" },
      body: JSON.stringify({ q }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const wwwAuth = res.headers.get("www-authenticate") || "";
      throw new Error(`SuiteQL HTTP ${res.status}${wwwAuth ? ` [WWW-Authenticate: ${wwwAuth}]` : ""}: ${text.slice(0, 250)}`);
    }
    const json = await res.json();
    rows.push(...(json.items || []));
    if (!json.hasMore) break;
    offset += pageSize;
  }
  return rows;
}

const RESTLET_URL = process.env.NETSUITE_RESTLET_URL || "https://6494782.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=6753&deploy=1";

// Call a deployed RESTlet (GET) with TBA signing. All query params are part of the OAuth base string.
async function callRestlet(fullUrl, extraParams, creds) {
  const u = new URL(fullUrl);
  const baseUrl = u.origin + u.pathname;
  const params = {};
  u.searchParams.forEach((v, k) => { params[k] = v; });
  Object.assign(params, extraParams || {});
  const qs = Object.keys(params).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
  const auth = oauthHeader("GET", baseUrl, creds, params);
  const res = await fetch(baseUrl + "?" + qs, { method: "GET", headers: { Authorization: auth, "Content-Type": "application/json" } });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const wa = res.headers.get("www-authenticate") || "";
    throw new Error(`RESTlet HTTP ${res.status}${wa ? ` [${wa}]` : ""}: ${text.slice(0, 250)}`);
  }
  try { return JSON.parse(text); } catch (e) { return { raw: text.slice(0, 500) }; }
}

const num = (v) => {
  const n = parseFloat(String(v == null ? "" : v).replace(/[, ]/g, ""));
  return isFinite(n) ? n : 0;
};
const fill = (sql, s, e) => sql.replace(/\{start\}/g, s).replace(/\{end\}/g, e);

// Class internal IDs -> name and product-line grouping (from CustomClassDefaultViewResults232.csv)
const CLASS_NAME = {1:'Beverage',2:'Barmix-FG',3:'Formula-B Sub ASM',4:'Custom Brand Label-PKG',5:'Dry Ingr-RM',6:'Energy Drink-FG',7:'Liquid Ingr-RM',8:'Powder Mix-FG',9:'Powder-Sub ASM',10:'Primary-Bev PKG',11:'Sauce-FG',12:'Secondary-PKG',13:'Smoothie-FG',14:'Syrups-FG',15:'Tea-FG',16:'Toppings-FG',19:'Straw',20:'CA-FG',21:'Formula-S Sub ASM',22:'PHA-FG',23:'PP-FG',25:'Resin-RM',101:'Straw Primary-PKG',102:'Straw Secondary-PKG',111:'Straws-Obsolete',112:'Purchase Straws-FG',113:'NA Spirits-FG',115:'Formula-B Sub ASM-Stocked'};
// Finished-goods classes only (exclude sub-assemblies, raw materials, packaging, purchased, obsolete)
const BEVERAGE_CLASSES = [2,6,8,11,13,14,15,16,113]; // Barmix, Energy Drink, Powder Mix, Sauce, Smoothie, Syrups, Tea, Toppings, NA Spirits
const STRAW_CLASSES = [20,22,23];                     // CA-FG, PHA-FG, PP-FG (excludes Purchase Straws-FG)
const clsName = (id) => CLASS_NAME[Number(id)] || ('Class ' + id);

// Production output = Work Order build quantity (FG line), grouped by date + finished-good class
// total_units = quantity built/completed (quantityshiprecv on the WO line); qty_ordered = quantity to build
const woProdSql = (classIds) => `
SELECT TO_CHAR(t.trandate,'YYYY-MM-DD') AS "date", tl.class AS class_id, SUM(tl.quantityshiprecv) AS "total_units", SUM(tl.quantity) AS "qty_ordered"
FROM transaction t INNER JOIN transactionline tl ON tl.transaction = t.id
WHERE t.type = 'WorkOrd' AND tl.mainline = 'T' AND tl.class IN (${classIds.join(',')})
  AND t.trandate BETWEEN TO_DATE('{start}','YYYY-MM-DD') AND TO_DATE('{end}','YYYY-MM-DD')
GROUP BY TO_CHAR(t.trandate,'YYYY-MM-DD'), tl.class ORDER BY 1`;

// Beverage splits into two physical lines by unit of measure:
//   Bottling Line = liquid bottled (UoM Each, unit id 23); Powder Line = dry/powder mix (UoM Pound, unit id 1).
const woProdByUnitSql = (classIds) => `
SELECT TO_CHAR(t.trandate,'YYYY-MM-DD') AS "date", tl.units AS unit_id, SUM(tl.quantityshiprecv) AS "total_units", SUM(tl.quantity) AS "qty_ordered"
FROM transaction t INNER JOIN transactionline tl ON tl.transaction = t.id
WHERE t.type = 'WorkOrd' AND tl.mainline = 'T' AND tl.class IN (${classIds.join(',')})
  AND t.trandate BETWEEN TO_DATE('{start}','YYYY-MM-DD') AND TO_DATE('{end}','YYYY-MM-DD')
GROUP BY TO_CHAR(t.trandate,'YYYY-MM-DD'), tl.units ORDER BY 1`;
const BEV_UNIT = { 23: { line: "Bottling Line", uom: "ea" }, 1: { line: "Powder Line", uom: "lb" } };

const DEFAULTS = {
  bottling: {
    sql: woProdByUnitSql(BEVERAGE_CLASSES),
    map: (r) => { const u = BEV_UNIT[Number(r.unit_id)] || { line: "Other (unit " + r.unit_id + ")", uom: "" }; return { date: r.date, line: u.line, uom: u.uom, total_units: num(r.total_units), qty_ordered: num(r.qty_ordered) }; },
  },
  straw: {
    sql: woProdSql(STRAW_CLASSES),
    map: (r) => ({ date: r.date, line: clsName(r.class_id), uom: "cases", total_units: num(r.total_units), qty_ordered: num(r.qty_ordered) }),
  },
  warehouse: {
    sql: `
SELECT TO_CHAR(t.trandate,'YYYY-MM-DD') AS "date",
       SUM(CASE WHEN t.type='ItemRcpt' THEN 1 ELSE 0 END) AS "receipts_total",
       0 AS "receipts_on_time",
       SUM(CASE WHEN t.type='ItemShip' THEN 1 ELSE 0 END) AS "shipments_total",
       0 AS "shipments_on_time"
FROM transaction t
WHERE t.type IN ('ItemRcpt','ItemShip')
  AND t.trandate BETWEEN TO_DATE('{start}','YYYY-MM-DD') AND TO_DATE('{end}','YYYY-MM-DD')
GROUP BY TO_CHAR(t.trandate,'YYYY-MM-DD')
ORDER BY 1`,
    map: (r) => ({
      date: r.date,
      receipts_total: num(r.receipts_total),
      receipts_on_time: num(r.receipts_on_time),
      shipments_total: num(r.shipments_total),
      shipments_on_time: num(r.shipments_on_time),
    }),
  },
};
const ENV_SQL = { bottling: "NETSUITE_SQL_BOTTLING", straw: "NETSUITE_SQL_STRAW", warehouse: "NETSUITE_SQL_WAREHOUSE" };

module.exports = async (req, res) => {
  // CORS — allow the dashboard to call this from the Artifact Hub's sandboxed iframe (Origin: null)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  const ds = String((req.query && req.query.dataset) || "bottling").toLowerCase();
  // Call the deployed saved-search RESTlet: ?dataset=restlet&searchId=customsearch_xxx
  if (ds === "restlet") {
    try {
      const creds = getCreds();
      const searchId = req.query && (req.query.searchId || req.query.search);
      const j = await callRestlet(RESTLET_URL, searchId ? { searchId: searchId } : {}, creds);
      res.status(200).json(j);
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
    return;
  }
  if (!DEFAULTS[ds]) {
    res.status(400).json({ error: `unknown dataset "${ds}" (bottling|straw|warehouse)` });
    return;
  }
  const ymd = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const start = (req.query && req.query.start) || ymd(new Date(today.getTime() - 90 * 86400000));
  const end = (req.query && req.query.end) || ymd(today);
  try {
    const creds = getCreds();
    res.setHeader("Cache-Control", "no-store");
    if (ds === "warehouse") {
      const shipSql = `SELECT TO_CHAR(t.trandate,'YYYY-MM-DD') AS d, COUNT(*) AS ship FROM transaction t WHERE t.type='ItemShip' AND t.trandate BETWEEN TO_DATE('${start}','YYYY-MM-DD') AND TO_DATE('${end}','YYYY-MM-DD') GROUP BY TO_CHAR(t.trandate,'YYYY-MM-DD')`;
      // On-time: fulfillment actual ship (f.trandate) <= source SO expected ship (so.shipdate), linked via the fulfillment LINE's createdfrom
      // Expected Ship Date - M (custbody2) lives on the Sales Order; actual ship = fulfillment trandate
      const onTimeSql = `SELECT TO_CHAR(f.trandate,'YYYY-MM-DD') AS d, COUNT(DISTINCT CASE WHEN so.custbody2 IS NOT NULL AND f.trandate <= so.custbody2 THEN f.id END) AS ontime, COUNT(DISTINCT CASE WHEN so.custbody2 IS NOT NULL THEN f.id END) AS linked FROM transaction f INNER JOIN transactionline fl ON fl.transaction = f.id INNER JOIN transaction so ON so.id = fl.createdfrom AND so.type='SalesOrd' WHERE f.type='ItemShip' AND f.trandate BETWEEN TO_DATE('${start}','YYYY-MM-DD') AND TO_DATE('${end}','YYYY-MM-DD') GROUP BY TO_CHAR(f.trandate,'YYYY-MM-DD')`;
      // Fill rate = fulfilled qty ÷ ordered qty on COMPLETED finished-good orders (Billed=G, Closed=H).
      // SO line quantity is stored negative here → ABS(); non-Assembly lines carry junk magnitudes → itemtype filter.
      const fillSql = `SELECT TO_CHAR(t.trandate,'YYYY-MM-DD') AS d, ROUND(SUM(ABS(tl.quantity))) AS ordered, ROUND(SUM(tl.quantityshiprecv)) AS fulfilled FROM transaction t INNER JOIN transactionline tl ON tl.transaction = t.id WHERE t.type='SalesOrd' AND tl.mainline='F' AND tl.itemtype='Assembly' AND t.status IN ('G','H') AND t.trandate BETWEEN TO_DATE('${start}','YYYY-MM-DD') AND TO_DATE('${end}','YYYY-MM-DD') GROUP BY TO_CHAR(t.trandate,'YYYY-MM-DD')`;
      const ship = await suiteql(shipSql, creds);
      let onTimeRows = [], otErr = null;
      try { onTimeRows = await suiteql(onTimeSql, creds); } catch (e) { otErr = e.message; }
      let fillRows = [], fillErr = null;
      try { fillRows = await suiteql(fillSql, creds); } catch (e) { fillErr = e.message; }
      const byDate = {};
      ship.forEach((r) => { (byDate[r.d] = byDate[r.d] || { date: r.d }).shipments_total = Number(r.ship) || 0; });
      onTimeRows.forEach((r) => { const o = byDate[r.d] = byDate[r.d] || { date: r.d }; o.shipments_on_time = Number(r.ontime) || 0; o.shipments_with_expected = Number(r.linked) || 0; });
      fillRows.forEach((r) => { const o = byDate[r.d] = byDate[r.d] || { date: r.d }; o.qty_ordered = Number(r.ordered) || 0; o.qty_fulfilled = Number(r.fulfilled) || 0; });
      // Pick productivity from WMS Closed Task (custrecord_wmsse_trn_closedtask): tasktype 3 = PICK, picker = Updated User #
      const pickSql = `SELECT TO_CHAR(ct.custrecord_wmsse_act_end_date_clt,'YYYY-MM-DD') AS d, COUNT(*) AS picks, COUNT(DISTINCT ct.custrecord_wmsse_upd_user_no_clt) AS pickers FROM customrecord_wmsse_trn_closedtask ct WHERE ct.custrecord_wmsse_tasktype_clt=3 AND ct.custrecord_wmsse_act_end_date_clt BETWEEN TO_DATE('${start}','YYYY-MM-DD') AND TO_DATE('${end}','YYYY-MM-DD') GROUP BY TO_CHAR(ct.custrecord_wmsse_act_end_date_clt,'YYYY-MM-DD')`;
      let pickRows = [], pickErr = null;
      try { pickRows = await suiteql(pickSql, creds); } catch (e) { pickErr = e.message; }
      pickRows.forEach((r) => { const o = byDate[r.d] = byDate[r.d] || { date: r.d }; o.pick_lines = Number(r.picks) || 0; o.pickers = Number(r.pickers) || 0; });
      // Receiving from Item Receipts: volume + on-time vs the source PO's due date (createdfrom → PO.duedate)
      const rcptSql = `SELECT TO_CHAR(t.trandate,'YYYY-MM-DD') AS d, COUNT(DISTINCT t.id) AS receipts, COUNT(CASE WHEN po.duedate IS NOT NULL THEN 1 END) AS due, COUNT(CASE WHEN po.duedate IS NOT NULL AND t.trandate <= po.duedate THEN 1 END) AS ontime FROM transaction t INNER JOIN transactionline tl ON tl.transaction=t.id AND tl.mainline='F' LEFT JOIN transaction po ON po.id=tl.createdfrom WHERE t.type='ItemRcpt' AND t.trandate BETWEEN TO_DATE('${start}','YYYY-MM-DD') AND TO_DATE('${end}','YYYY-MM-DD') GROUP BY TO_CHAR(t.trandate,'YYYY-MM-DD')`;
      let rcptRows = [], rcptErr = null;
      try { rcptRows = await suiteql(rcptSql, creds); } catch (e) { rcptErr = e.message; }
      rcptRows.forEach((r) => { const o = byDate[r.d] = byDate[r.d] || { date: r.d }; o.receipts_total = Number(r.receipts) || 0; o.receipt_lines_due = Number(r.due) || 0; o.receipt_lines_ontime = Number(r.ontime) || 0; });
      const data = Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
      const notes = [otErr && ("on-time unavailable: " + otErr.slice(0, 80)), fillErr && ("fill-rate unavailable: " + fillErr.slice(0, 80)), pickErr && ("pick productivity unavailable: " + pickErr.slice(0, 80)), rcptErr && ("receiving unavailable: " + rcptErr.slice(0, 80))].filter(Boolean);
      res.status(200).json({ dataset: ds, source: "netsuite", range: { start, end }, count: data.length, data, note: notes.length ? notes.join(" | ") : undefined });
      return;
    }
    const def = DEFAULTS[ds];
    const sql = fill(process.env[ENV_SQL[ds]] || def.sql, start, end);
    const rows = await suiteql(sql, creds);
    res.status(200).json({ dataset: ds, source: "netsuite", range: { start, end }, count: rows.length, data: rows.map(def.map) });
  } catch (e) {
    const status = /missing env/i.test(e.message) ? 503 : 502;
    res.status(status).json({ error: e.message, dataset: ds });
  }
};
