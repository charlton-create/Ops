# Eagle KPI ← NetSuite — Live Integration Status

The dashboard pulls live NetSuite data through a server-side SuiteQL/RESTlet proxy
(`public/eagle-kpi/netsuite-proxy.js`, deployed as the Vercel function on the
`eagle-kpi-deploy` project). Credentials live in Vercel env vars (`NETSUITE_*`);
account **6494782**, subsidiary **Eagle Beverage & Accessory Products, LLC** (id 2).

## Live KPIs

| Area | KPI | Source / logic |
|---|---|---|
| **Bottling (Beverage)** | Built qty by **line** | Work Orders (`type='WorkOrd'`), `SUM(tl.quantityshiprecv)` grouped by `tl.units`: **Bottling Line** = Each (unit 23, bottled liquid), **Powder Line** = Pound (unit 1, dry/powder mix). Never SUM across units. |
| **Straw** | Built **cases** | same, class ∈ straw FG; UoM Each, which the plant treats as 1 Case |
| **Shipping** | On-Time % | Item Fulfillment `trandate` ≤ source SO `custbody2` ("Expected Ship Date - M"), linked via `transactionline.createdfrom` |
| **Shipping** | Order Fill Rate | SO lines `quantityshiprecv >= quantity` |
| **Shipping** | Shipments/day | count of `type='ItemShip'` |
| **WMS / Shipping** | **Pick productivity** (lines ÷ picker-days) | SuiteQL on `customrecord_wmsse_trn_closedtask` — tasktype `3`=PICK, picker = Updated User # (`custrecord_wmsse_upd_user_no_clt`), grouped by Actual End Date. Merged into the `warehouse` dataset. |
| **Receiving** | **Receipts/day** + **On-time %** | Item Receipts (`type='ItemRcpt'`); on-time = receipt `trandate` ≤ source PO `duedate` via `tl.createdfrom` (due date on ~⅓ of lines). Merged into the `warehouse` dataset. |
| **Inventory** | Count schedule / compliance | saved search `customsearch_sc_count_date_ss` |

## Finished-goods class IDs (production split)
From `CustomClassDefaultViewResults232.csv`:
- **Beverage FG:** 2, 6, 8, 11, 13, 14, 15, 16, 113 (Barmix, Energy Drink, Powder Mix, Sauce, Smoothie, Syrups, Tea, Toppings, NA Spirits)
- **Straw FG:** 20, 22, 23 (CA-FG, PHA-FG, PP-FG) — excludes Purchase Straws-FG (112, purchased not made)
- Excluded everywhere: sub-assemblies, raw materials, packaging, obsolete, bare Beverage/Straw buckets.

## Hard-won SuiteQL facts (account-specific)
- **No** Assembly Builds / Work Order Completions — production is the Work Order's built qty (`quantityshiprecv`), **not** `built`/`quantitybuilt` (neither is a valid SuiteQL column here).
- **Production UoM differs by line** — beverage WOs are **Each** (Bottling Line, unit id 23, bottled liquid) or **Pound** (Powder Line, unit id 1, dry/powder mix); summing the two is meaningless, so group by `tl.units` and label per unit. Straw is all **Each**, which the plant treats as **1 Case**. The dashboard shows Bottling Line (ea) + Powder Line (lb) separately and labels straw in cases.
- **Reports ≠ saved searches.** `CUSTOMREPORT_*` (Report Builder) ids are **not** loadable via the search API (`search.load` → "INVALID_SEARCH: does not exist"); only saved searches (`customsearch_*`). To pull a Report's data, rebuild it as a saved search. The WMS Closed Task record (SuiteQL table) is `customrecord_wmsse_trn_closedtask`; task-type ids: 3=PICK, 2=PUTW, 9=MOVE, 18=XFER, 5=KTS, 7=CYCC, 14=PACK, 17=RPLN. "Task Assigned To" is empty — use "Updated User #" for the operator. Putaway begin *time* is blank, so dock-to-stock needs a receipt timestamp from a (saved-search) receipts source.
- **Item Receipts DO exist** (`type='ItemRcpt'`, ~1,600+/yr) and are SuiteQL-queryable — an earlier scan wrongly reported zero (the token role lacked the permission at that time). Receiving volume + on-time are now live; on-time = receipt `trandate` ≤ source PO `duedate` via `tl.createdfrom` (PO due date on ~⅓ of receipt lines). **Dock-to-stock is not measurable from this data** — the WMS PUTW task's completion time *equals* the Item Receipt's created time (receipt & putaway are stamped at the same moment; the IR has no distinct closed date — `created==lastmodified`, `closedate` empty). PUTW links to its IR via `custrecord_wmsse_nsconfirm_ref_no_clt` = IR internal id, but the two timestamps are identical, so there's no dock→shelf gap to measure without a separate physical-arrival capture (gate-in / ASN). The `customsearch4561` Item-Receipt saved search does **not** load via the RESTlet ("unable to determine record type"), so query the transaction table directly instead.
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
