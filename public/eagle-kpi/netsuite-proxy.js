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
  // Open PO Aging — open PO lines aged from last receipt (or PO date). International = item class 112 (Purchase Straws-FG).
  if (ds === "poaging") {
    try {
      const creds = getCreds();
      const q = `SELECT t.tranid AS po, TO_CHAR(t.trandate,'YYYY-MM-DD') AS po_date, BUILTIN.DF(t.entity) AS vendor,
        BUILTIN.DF(pol.item) AS item, pol.class AS class_id, ABS(pol.quantity) AS ordered, ABS(pol.quantityshiprecv) AS received,
        (SELECT TO_CHAR(MAX(ir.trandate),'YYYY-MM-DD') FROM transaction ir INNER JOIN transactionline irl ON irl.transaction=ir.id WHERE ir.type='ItemRcpt' AND irl.createdfrom = t.id AND irl.item = pol.item) AS last_receipt
        FROM transaction t INNER JOIN transactionline pol ON pol.transaction=t.id AND pol.mainline='F' AND pol.item IS NOT NULL
        WHERE t.type='PurchOrd' AND t.status IN ('B','D','E') AND ABS(pol.quantity) > ABS(pol.quantityshiprecv)`;
      const rows = await suiteql(q, creds, 1000, 5);
      const today = new Date();
      const INTL_CLASS = 112; // Purchase Straws - FG = imported
      const DAY = 86400000;
      // Tiers (count of open PO lines): green = within tolerance (dom 4wk / intl 8wk), yellow = tol→12wk, pink = 12→26wk, red = >26wk
      const tiers = { green: 0, yellow: 0, pink: 0, red: 0 };
      const list = [];
      rows.forEach((r) => {
        const intl = Number(r.class_id) === INTL_CLASS;
        const anchor = r.last_receipt || r.po_date;
        const weeks = anchor ? +(((today - new Date(anchor + "T00:00:00")) / DAY) / 7).toFixed(1) : null;
        const open = num(r.ordered) - num(r.received);
        const thr = intl ? 8 : 4;
        let tier = "green";
        if (weeks != null) { if (weeks > 26) tier = "red"; else if (weeks > 12) tier = "pink"; else if (weeks > thr) tier = "yellow"; }
        tiers[tier]++;
        if (tier !== "green") list.push({ po: r.po, vendor: r.vendor, item: r.item, open: Math.round(open), po_date: r.po_date, last_receipt: r.last_receipt || null, origin: intl ? "International" : "Domestic", weeks, tier });
      });
      list.sort((a, b) => b.weeks - a.weeks);
      res.status(200).json({ dataset: "poaging", tiers, count: list.length, rows: list });
    } catch (e) { res.status(502).json({ error: e.message }); }
    return;
  }
  // Material Draw — RM + packaging consumed on Work Orders, reported by the FINISHED-GOOD class built (phantom sub-assemblies explode into the FG WO). Live class.
  if (ds === "materialdraw") {
    try {
      const creds = getCreds();
      let ICMAP = {};
      try { ICMAP = require("./itemclass.json"); } catch (e) {}
      const role = (cls) => { const s = String(cls || "").toLowerCase(); if (/sub asm/.test(s)) return "SUB"; if (/-fg| fg$|sno-cone/.test(s)) return "FG"; if (/-rm$/.test(s)) return "RM"; if (/pkg/.test(s)) return "PKG"; if (/obsolete/.test(s)) return "OBS"; return "OTHER"; };
      const t = new Date();
      const startY = (t.getFullYear() - 1) + "-01-01";
      const endY = t.toISOString().slice(0, 10);
      const builtSql = `SELECT TO_CHAR(t.trandate,'IYYY-IW') AS wk, MIN(TO_CHAR(t.trandate,'YYYY-MM-DD')) AS d, BUILTIN.DF(im.class) AS cls, SUM(tlm.quantity) AS qty FROM transaction t INNER JOIN transactionline tlm ON tlm.transaction=t.id AND tlm.mainline='T' INNER JOIN item im ON im.id=tlm.item WHERE t.type='WorkOrd' AND t.trandate >= TO_DATE('${startY}','YYYY-MM-DD') AND t.trandate <= TO_DATE('${endY}','YYYY-MM-DD') GROUP BY TO_CHAR(t.trandate,'IYYY-IW'), BUILTIN.DF(im.class)`;
      const fgSql = `SELECT BUILTIN.DF(fgc.parent) AS prod_line, BUILTIN.DF(im.class) AS fg_class, BUILTIN.DF(ci.class) AS comp_class, BUILTIN.DF(tl.units) AS uom, ROUND(SUM(ABS(tl.quantity))) AS qty FROM transaction t INNER JOIN transactionline tl ON tl.transaction=t.id INNER JOIN item ci ON ci.id=tl.item INNER JOIN transactionline tlm ON tlm.transaction=t.id AND tlm.mainline='T' INNER JOIN item im ON im.id=tlm.item INNER JOIN classification fgc ON fgc.id=im.class WHERE t.type='WorkOrd' AND tl.mainline='F' AND tl.item IS NOT NULL AND t.trandate >= TO_DATE('${startY}','YYYY-MM-DD') AND t.trandate <= TO_DATE('${endY}','YYYY-MM-DD') GROUP BY BUILTIN.DF(fgc.parent), BUILTIN.DF(im.class), BUILTIN.DF(ci.class), BUILTIN.DF(tl.units)`;
      const builtRows = await suiteql(builtSql, creds, 1000, 12);
      const fgRows = await suiteql(fgSql, creds, 1000, 12);
      let builtFg = 0; const wkMap = {};
      builtRows.forEach((r) => { if (role(r.cls) !== "FG") return; const q = num(r.qty); builtFg += q; const w = wkMap[r.wk] = wkMap[r.wk] || { wk: r.wk, d: r.d, FG: 0 }; w.FG += q; if (r.d < w.d) w.d = r.d; });
      const builtWeekly = Object.values(wkMap).sort((a, b) => a.d < b.d ? -1 : 1).map((w) => ({ wk: w.wk, d: w.d, FG: Math.round(w.FG) }));
      const lineMap = {}; let rmTotal = 0, pkgTotal = 0, pkgFilm = 0, legacyRm = 0;
      fgRows.forEach((r) => {
        const fgR = role(r.fg_class), cr = role(r.comp_class), q = num(r.qty);
        if (cr === "RM" && fgR !== "FG") { legacyRm += q; return; }
        if (fgR !== "FG") return;
        let matRole;
        if (cr === "RM") matRole = "RM";
        else if (cr === "PKG" && !/secondary/i.test(r.comp_class) && r.uom === "Each") matRole = "PKG";
        else if (cr === "PKG" && !/secondary/i.test(r.comp_class)) { pkgFilm += q; return; }
        else return;
        const line = r.prod_line || "Unassigned line";
        const L = lineMap[line] || (lineMap[line] = { line, rm: 0, pkg: 0, fgs: {} });
        const F = L.fgs[r.fg_class] || (L.fgs[r.fg_class] = { fgClass: r.fg_class, rm: 0, pkg: 0, mats: {} });
        const mk = r.comp_class + "|" + r.uom; const M = F.mats[mk] || (F.mats[mk] = { cls: r.comp_class, role: matRole, uom: r.uom, qty: 0 });
        M.qty += q;
        if (matRole === "RM") { F.rm += q; L.rm += q; rmTotal += q; } else { F.pkg += q; L.pkg += q; pkgTotal += q; }
      });
      const lines = Object.values(lineMap).map((L) => ({ line: L.line, rm: Math.round(L.rm), pkg: Math.round(L.pkg), fgs: Object.values(L.fgs).map((F) => ({ fgClass: F.fgClass, rm: Math.round(F.rm), pkg: Math.round(F.pkg), materials: Object.values(F.mats).map((m) => ({ cls: m.cls, role: m.role, uom: m.uom, qty: Math.round(m.qty) })).sort((a, b) => b.qty - a.qty) })).sort((a, b) => (b.rm + b.pkg) - (a.rm + a.pkg)) })).sort((a, b) => (b.rm + b.pkg) - (a.rm + a.pkg));
      res.status(200).json({ dataset: "materialdraw", range: { start: startY, end: endY }, builtFgUnits: Math.round(builtFg), builtWeekly, lines, rmTotal: Math.round(rmTotal), pkgTotal: Math.round(pkgTotal), pkgFilm: Math.round(pkgFilm), legacyRm: Math.round(legacyRm), note: "RM + primary packaging (Each) on Work Orders, grouped Production Line -> FG class -> material class. Secondary packaging excluded; paper-wrap/film (Length) and pre-Feb-2026 sub-assembly RM tracked separately." });
    } catch (e) { res.status(502).json({ error: e.message }); }
    return;
  }
  // Material Yield / Scrap variance — WO component ACTUAL issued (quantityshiprecv) vs
  // STANDARD (BOM required qty scaled to the qty actually built), by FINISHED-GOOD class
  // and component UoM (never sum across UoM). yield% = standard/actual; loss = actual-standard.
  if (ds === "materialyield") {
    try {
      const creds = getCreds();
      // Same class-role heuristic as materialdraw so both KPIs treat items identically.
      const role = (cls) => { const s = String(cls || "").toLowerCase(); if (/sub asm/.test(s)) return "SUB"; if (/-fg| fg$|sno-cone/.test(s)) return "FG"; if (/-rm$/.test(s)) return "RM"; if (/pkg/.test(s)) return "PKG"; if (/obsolete/.test(s)) return "OBS"; return "OTHER"; };
      const isMaterial = (cls) => { const r = role(cls); return r === "RM" || r === "PKG"; }; // leaf materials only
      const t = new Date();
      const startY = (t.getFullYear() - 1) + "-01-01";
      const endY = t.toISOString().slice(0, 10);
      const scaled = "ABS(cl.quantity) * CASE WHEN ABS(ml.quantity)>0 THEN ml.quantityshiprecv/ABS(ml.quantity) ELSE 0 END";
      // Group by FINISHED-GOOD class + COMPONENT class + UoM. Sub-assembly component lines
      // are dropped in JS (role SUB) — phantoms explode to their raws (which show issued>0
      // on the FG WO and ARE counted), and WO-sourced sub-assemblies are counted on their
      // own build, so counting the sub-assembly line here would double-count / mislabel it.
      const cols = "BUILTIN.DF(im.class) AS fg_class, BUILTIN.DF(ci.class) AS comp_class, BUILTIN.DF(cl.units) AS uom, ROUND(SUM(cl.quantityshiprecv),2) AS actual, ROUND(SUM(" + scaled + "),2) AS standard";
      const from = "FROM transaction t INNER JOIN transactionline cl ON cl.transaction=t.id AND cl.mainline='F' AND cl.item IS NOT NULL INNER JOIN transactionline ml ON ml.transaction=t.id AND ml.mainline='T' INNER JOIN item im ON im.id=ml.item INNER JOIN item ci ON ci.id=cl.item";
      const where = `WHERE t.type='WorkOrd' AND cl.quantityshiprecv>0 AND t.trandate>=TO_DATE('${startY}','YYYY-MM-DD') AND t.trandate<=TO_DATE('${endY}','YYYY-MM-DD')`;
      const byClassSql = `SELECT ${cols} ${from} ${where} GROUP BY BUILTIN.DF(im.class), BUILTIN.DF(ci.class), BUILTIN.DF(cl.units)`;
      const weeklySql = `SELECT TO_CHAR(t.trandate,'IYYY-IW') AS wk, MIN(TO_CHAR(t.trandate,'YYYY-MM-DD')) AS d, BUILTIN.DF(ci.class) AS comp_class, ROUND(SUM(cl.quantityshiprecv),2) AS actual, ROUND(SUM(${scaled}),2) AS standard ${from} ${where} GROUP BY TO_CHAR(t.trandate,'IYYY-IW'), BUILTIN.DF(ci.class)`;
      const [rawRows, wkRows] = await Promise.all([suiteql(byClassSql, creds, 1000, 12), suiteql(weeklySql, creds, 1000, 12)]);
      const byClass = {};
      rawRows.forEach((r) => { if (role(r.fg_class) !== "FG") return; if (!isMaterial(r.comp_class)) return; const k = r.fg_class + "|" + r.uom; const o = byClass[k] || (byClass[k] = { fgClass: r.fg_class, uom: r.uom, actual: 0, standard: 0 }); o.actual += num(r.actual); o.standard += num(r.standard); });
      const classes = Object.values(byClass)
        .map((c) => ({ fgClass: c.fgClass, uom: c.uom, actual: Math.round(c.actual), standard: Math.round(c.standard), lossPct: c.actual > 0 ? +(100 * (c.actual - c.standard) / c.actual).toFixed(1) : 0, yieldPct: c.actual > 0 ? +(100 * c.standard / c.actual).toFixed(1) : null }))
        .sort((a, b) => b.actual - a.actual);
      const wkMap = {};
      wkRows.forEach((r) => { if (!isMaterial(r.comp_class)) return; const o = wkMap[r.wk] || (wkMap[r.wk] = { wk: r.wk, d: r.d, actual: 0, standard: 0 }); o.actual += num(r.actual); o.standard += num(r.standard); if (r.d < o.d) o.d = r.d; });
      const weekly = Object.values(wkMap).map((w) => ({ wk: w.wk, d: w.d, actual: Math.round(w.actual), standard: Math.round(w.standard), yieldPct: w.actual > 0 ? +(100 * w.standard / w.actual).toFixed(1) : null })).sort((a, b) => a.d < b.d ? -1 : 1);
      const tA = classes.reduce((n, c) => n + c.actual, 0), tS = classes.reduce((n, c) => n + c.standard, 0);
      res.status(200).json({ dataset: "materialyield", range: { start: startY, end: endY }, overallYieldPct: tA > 0 ? +(100 * tS / tA).toFixed(1) : null, actualTotal: Math.round(tA), standardTotal: Math.round(tS), classes, weekly, note: "Actual component consumption (issued) vs BOM standard scaled to units built, on finished-good Work Orders — RM + packaging only. Sub-assemblies are treated as phantoms (their leaf materials are counted, not the sub-assembly item). yield% = standard ÷ actual; loss% = over-consumption." });
    } catch (e) { res.status(502).json({ error: e.message }); }
    return;
  }
  // Inventory Accuracy — dollar-based from native Inventory Adjustments (the count
  // reconciliation output): accuracy% = 1 − |adjustment value| ÷ current inventory value.
  // Dollar-normalized so mixed UoM don't distort it.
  // Inventory Accuracy — count-based Inventory Record Accuracy (IRA), the standard
  // metric: of the item-lines physically counted, what % matched the system (needed
  // no adjustment). Native Inventory Counts + the Inventory Adjustments they produce
  // (adjustment header `createdfrom` = the count; item detail on its mainline='F' lines).
  // NOT the dollar-variance method — that could exceed inventory value and go negative,
  // and it lumped in build/receipt/scrap adjustments that aren't count discrepancies.
  if (ds === "invaccuracy") {
    try {
      const creds = getCreds();
      // distinct (count, item) pairs counted — the COUNTQUANTITY lines — by count month
      const linesSql = "SELECT TO_CHAR(t.trandate,'YYYY-MM') AS mo, COUNT(DISTINCT t.id||'-'||tl.item) AS lines FROM transaction t JOIN transactionline tl ON tl.transaction=t.id AND tl.transactionlinetype='COUNTQUANTITY' AND tl.item IS NOT NULL WHERE t.type='InvCount' GROUP BY TO_CHAR(t.trandate,'YYYY-MM')";
      // distinct (count, item) pairs that VARIED (a count-sourced adjustment corrected them),
      // grouped by the COUNT's month (not the adjustment's — they can differ), + count-driven $.
      const variedSql = "SELECT TO_CHAR(src.trandate,'YYYY-MM') AS mo, COUNT(DISTINCT src.id||'-'||al.item) AS varied, ROUND(SUM(ABS(al.quantity * NVL(i.averagecost, i.lastpurchaseprice)))) AS dollar FROM transaction a JOIN transactionline aml ON aml.transaction=a.id AND aml.mainline='T' JOIN transaction src ON src.id=aml.createdfrom AND src.type='InvCount' JOIN transactionline al ON al.transaction=a.id AND al.mainline='F' AND al.item IS NOT NULL JOIN item i ON i.id=al.item WHERE a.type='InvAdjst' GROUP BY TO_CHAR(src.trandate,'YYYY-MM')";
      const eventsSql = "SELECT COUNT(*) AS counts, SUM(CASE WHEN vc.cnt>0 THEN 1 ELSE 0 END) AS with_var FROM inventorycount ic LEFT JOIN (SELECT aml.createdfrom AS src_id, COUNT(*) AS cnt FROM transaction a JOIN transactionline aml ON aml.transaction=a.id AND aml.mainline='T' WHERE a.type='InvAdjst' AND aml.createdfrom IS NOT NULL GROUP BY aml.createdfrom) vc ON vc.src_id=ic.id";
      const [lineRows, variedRows, evRows, ivRows] = await Promise.all([
        suiteql(linesSql, creds, 1000, 8), suiteql(variedSql, creds, 1000, 8), suiteql(eventsSql, creds, 1000, 2),
        suiteql("SELECT ROUND(SUM(ib.quantityonhand * NVL(i.averagecost, i.lastpurchaseprice))) AS val FROM inventoryBalance ib JOIN item i ON i.id=ib.item WHERE ib.quantityonhand>0", creds, 1000, 4),
      ]);
      const byMo = {};
      lineRows.forEach((r) => { const o = byMo[r.mo] = byMo[r.mo] || { mo: r.mo, lines: 0, varied: 0, dollar: 0 }; o.lines = num(r.lines); });
      variedRows.forEach((r) => { const o = byMo[r.mo] = byMo[r.mo] || { mo: r.mo, lines: 0, varied: 0, dollar: 0 }; o.varied = num(r.varied); o.dollar = num(r.dollar); });
      const monthly = Object.values(byMo).map((o) => ({ mo: o.mo, lines: o.lines, varied: o.varied, dollarVariance: Math.round(o.dollar), accuracyPct: o.lines > 0 ? +(100 * (1 - o.varied / o.lines)).toFixed(1) : null })).sort((a, b) => a.mo < b.mo ? -1 : 1);
      const totLines = monthly.reduce((n, o) => n + o.lines, 0), totVaried = monthly.reduce((n, o) => n + o.varied, 0), totDollar = monthly.reduce((n, o) => n + o.dollarVariance, 0);
      const counts = num(evRows[0] && evRows[0].counts), withVar = num(evRows[0] && evRows[0].with_var);
      const iv = num(ivRows[0] && ivRows[0].val);
      res.status(200).json({
        dataset: "invaccuracy",
        accuracyPct: totLines > 0 ? +(100 * (1 - totVaried / totLines)).toFixed(1) : null,       // headline: line-level IRA
        eventAccuracyPct: counts > 0 ? +(100 * (1 - withVar / counts)).toFixed(1) : null,          // % of count events spot-on
        countLines: totLines, variedLines: totVaried, counts, countsWithVariance: withVar,
        dollarVariance: Math.round(totDollar), inventoryValue: Math.round(iv),
        monthly,
        note: "Inventory Record Accuracy = counted item-lines that matched the system ÷ item-lines counted (native Inventory Counts + the adjustments they created). Dollar variance is count-driven adjustments only.",
      });
    } catch (e) { res.status(502).json({ error: e.message }); }
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
      // (Inventory accuracy is its own dataset now — the count-based IRA metric at
      //  ?dataset=invaccuracy, not a per-date dollar figure folded in here.)
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
