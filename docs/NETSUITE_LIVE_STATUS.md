# Eagle KPI ← NetSuite — Live Integration Status

The dashboard pulls live NetSuite data through a server-side SuiteQL/RESTlet proxy
(`public/eagle-kpi/netsuite-proxy.js`, deployed as the Vercel function on the
`eagle-kpi-deploy` project). Credentials live in Vercel env vars (`NETSUITE_*`);
account **6494782**, subsidiary **Eagle Beverage & Accessory Products, LLC** (id 2).

## Live KPIs

| Area | KPI | Source / logic |
|---|---|---|
| **Bottling (Beverage)** | Units **built** | Work Orders (`type='WorkOrd'`), `SUM(tl.quantityshiprecv)` on mainline, class ∈ beverage FG |
| **Straw** | Units **built** | same, class ∈ straw FG |
| **Shipping** | On-Time % | Item Fulfillment `trandate` ≤ source SO `custbody2` ("Expected Ship Date - M"), linked via `transactionline.createdfrom` |
| **Shipping** | Order Fill Rate | SO lines `quantityshiprecv >= quantity` |
| **Shipping** | Shipments/day | count of `type='ItemShip'` |
| **WMS** (via RESTlet) | Pick/putaway tasks, productivity | saved search `customsearch4558` (WMS Closed Task) |
| **Inventory** | Count schedule / compliance | saved search `customsearch_sc_count_date_ss` |

## Finished-goods class IDs (production split)
From `CustomClassDefaultViewResults232.csv`:
- **Beverage FG:** 2, 6, 8, 11, 13, 14, 15, 16, 113 (Barmix, Energy Drink, Powder Mix, Sauce, Smoothie, Syrups, Tea, Toppings, NA Spirits)
- **Straw FG:** 20, 22, 23 (CA-FG, PHA-FG, PP-FG) — excludes Purchase Straws-FG (112, purchased not made)
- Excluded everywhere: sub-assemblies, raw materials, packaging, obsolete, bare Beverage/Straw buckets.

## Hard-won SuiteQL facts (account-specific)
- **No** Assembly Builds / Work Order Completions — production is the Work Order's built qty (`quantityshiprecv`), **not** `built`/`quantitybuilt` (neither is a valid SuiteQL column here).
- **No** Item Receipts → receiving KPIs unavailable from NetSuite.
- Fulfillment→SO link is `transactionline.createdfrom` (line level). `transaction.createdfrom` (header) is **not** valid.
- Expected ship date = SO `custbody2`; actual ship = fulfillment `trandate`.
- `GROUP BY t.type` and `BUILTIN.DF(...)` in grouped queries throw 500 — use `CASE WHEN t.type=...` aggregation instead.

## Role / permission requirements (the big lesson)
SuiteQL visibility is gated by the **token's role**. The role must have:
- Subsidiary access to **Eagle Beverage & Accessory Products, LLC**
- Transactions: Item Fulfillment, Work Order, Sales Order (View)
- Lists: **Bins**, Items, Locations (View)
- Custom Records: **WMS Closed Task**, **Item Count**, **Item Count Details** (View)
- REST Web Services, SuiteAnalytics Workbook, Log in using Access Tokens

## Pending
- **Inventory Accuracy / variance** — `customsearch_sc_count_variances_report` is on the SmartCount **"Item Count"** record and still returns `INSUFFICIENT_PERMISSION`. Add that record (and any SmartCount-specific permission) to the token's role; then wire the variance % (counted vs system qty).
- **OEE / Throughput / Quality / Machine Uptime** (Bottling & Straw) — need MES/shop-floor data (downtime, run rates, good/defect counts). Not in NetSuite; stay flagged "pending MES".

## Deploy / update
```
cp public/eagle-kpi/netsuite-proxy.js ~/Downloads/eagle-kpi-deploy/api/netsuite.js   # if editing here
cd ~/Downloads/eagle-kpi-deploy && npx vercel deploy --prod --yes
```
Endpoints: `/api/netsuite?dataset=bottling|straw|warehouse` and
`/api/netsuite?dataset=restlet&searchId=customsearch_xxx`.
