# Eagle KPI Dashboard — NetSuite Saved Search Build Guide

Build target: feed the Bottling, Straw, and Warehouse dashboards from NetSuite transactional data. This covers the **6 core saved searches** (7 with cycle counts) that NetSuite can actually source. Metrics that depend on the MES (downtime, run/ideal rates), on labor hours, or on quality capture are noted as blanks — they cannot come from NetSuite today.

---

## Conventions (read first — these prevent the two most common mistakes)

**Building a search:** Lists > Search > Saved Searches > New, then pick the record type. Set filters on the **Criteria** tab, columns and formulas on the **Results** tab.

**Field IDs:** In any formula box, type `{` and let the picker autocomplete. Field IDs vary by account and installed SuiteApps, so anywhere this guide marks **[verify]**, confirm the exact ID in the picker before trusting it.

**Ratios in summary (grouped) searches — the #1 gotcha:** never divide one summary column by another at the column level. Wrap both aggregations *inside a single formula* and set the column's **Summary Type = Maximum**. Pattern:

```
SUM(CASE WHEN <condition> THEN 1 ELSE 0 END) / NULLIF(COUNT({internalid}), 0)
```

**Divide-by-zero:** always guard the denominator with `NULLIF(x, 0)`.

**Date math:** `{dateA} - {dateB}` returns a number of **days**. Multiply by 24 for hours.

**The "line" dimension** (Line 1–4 bottling, Extruder A–C straw): NetSuite doesn't have a native production-line field. Identify which field carries it in your account — likely `{class}`, `{department}`, `{location}`, or a custom `{custbody_...}` / `{custcol_...}`. Wherever this guide says `{line}` **[verify]**, substitute the real one.

**Export to the dashboard:** each search lists its target CSV header so the export columns match what the dashboard's auto-detector expects. Use Export > CSV from the search results.

---

## Report 1 — Production Output (Bottling + Straw units built)

**Source:** Assembly Build transactions. The build's main line is the finished good (positive qty); component lines are negatives.

**Record type:** Transaction

**Criteria:**
- Type → **is** → Assembly Build
- Main Line → **is** → true *(one row per build, the FG quantity)*
- Date → within your dashboard period
- Optional: Item / Class → the bottling FG class, or straw FG class, to split the two dashboards

**Results (columns):**
| Column | Field / Formula | Summary |
|---|---|---|
| Date | `{trandate}` | Group |
| Line | `{line}` **[verify]** | Group |
| Built units | `{quantity}` | Sum |

**Target CSV columns:** `date`, `line`, `total_units` (= built units).
`good_units` has **no NetSuite source** — quality/defect data isn't being recorded. If you populate `good_units = total_units`, the dashboard's Quality factor will read a false 100% and inflate OEE. Leave it blank or flag the OEE tile as MES/quality-dependent.

---

## Report 2 — Straw Resin Yield (actual consumption vs. standard)

This is the build-over-consumption signal from the S&OP work (e.g., 2111001 running ~70% over standard). You can build it as its own search, or fold it into Report 1 with CASE formulas (shown below) so output and consumption come from one search.

**Record type:** Transaction

**Criteria:**
- Type → **is** → Assembly Build
- Date → within period
- *(Do NOT filter Main Line — you need both the FG line and the resin component lines)*
- Item → the resin component SKU(s) **or** the straw assembly + its resin component

**Results — single-search output + consumption:**
| Column | Formula (Numeric) | Summary |
|---|---|---|
| Date | `{trandate}` | Group |
| Line | `{line}` **[verify]** | Group |
| Built units | `SUM(CASE WHEN {mainline}='T' THEN {quantity} ELSE 0 END)` | Max |
| Resin used (kg) | `SUM(CASE WHEN {mainline}='F' THEN ABS({quantity}) ELSE 0 END)` | Max |
| kg per unit (actual) | `SUM(CASE WHEN {mainline}='F' THEN ABS({quantity}) ELSE 0 END) / NULLIF(SUM(CASE WHEN {mainline}='T' THEN {quantity} ELSE 0 END),0)` | Max |

**Standard (resin_std_kg):** the per-unit BOM standard isn't cleanly pullable in the same search without a messy BOM join. Two practical options:
1. Pull the per-unit standard once from the assembly item's BOM and hold it as a constant per SKU, then `resin_std_kg = built_units × standard_per_unit`.
2. Build a small separate BOM-member reference search (Assembly Item > Member sublist) to get `{memberquantity}` per component, joined by item.

**Target CSV columns:** `date`, `line`, `resin_used_kg`, `resin_std_kg`.

---

## Report 3 — On-Time Receiving (and dock-to-stock timestamp)

**Source:** Item Receipts vs. the PO's expected receipt date.

**Record type:** Transaction

**Criteria:**
- Type → **is** → Item Receipt
- Date → within period
- Main Line → as needed (true for one row per receipt; line-level if you want per-line)

**Results:**
| Column | Field / Formula | Summary |
|---|---|---|
| Date | `{trandate}` *(actual receipt date)* | Group |
| Receipts total | `COUNT({internalid})` | — (use Count summary) |
| Receipts on time | `SUM(CASE WHEN {trandate} <= {expectedreceiptdate} THEN 1 ELSE 0 END)` **[verify expectedreceiptdate]** | Max |

The expected receipt date lives on the PO line. If it doesn't flow through to the Item Receipt directly, reach it through the source-PO join — `{appliedtotransaction.expectedreceiptdate}` or the "Applied To Transaction" fields **[verify]**.

**Dock-to-stock hours (`dock_to_stock_hrs`):** as covered before, NetSuite has no native source. With custom timestamp fields:
```
ROUND(({custbody_putaway_complete} - {custbody_dock_arrival}) * 24, 2)
```
Without them, the Item Receipt created timestamp is only a receiving-lag proxy, not true dock-to-stock.

**Target CSV columns:** `date`, `receipts_on_time`, `receipts_total`, `dock_to_stock_hrs` (proxy until custom fields exist).

---

## Report 4 — Shipping: On-Time + Fill Rate

Two metrics, cleanest from two grains. You can keep them in one Sales Order search using the fulfillment join, or split them.

**4a — On-time shipping (Item Fulfillment grain)**

**Record type:** Transaction
- Type → **is** → Item Fulfillment
- Date → within period

| Column | Formula | Summary |
|---|---|---|
| Date | `{trandate}` | Group |
| Shipments total | `COUNT({internalid})` | Count |
| Shipments on time | `SUM(CASE WHEN {actualshipdate} <= {expectedshipdate} THEN 1 ELSE 0 END)` **[verify both date IDs]** | Max |

The requested/expected ship date comes from the source SO line — reach it via the Created-From join if it doesn't surface on the fulfillment.

**4b — Line fill rate (Sales Order grain)**

**Record type:** Transaction
- Type → **is** → Sales Order
- Date → within period (group by fulfillment/ship date for alignment)

| Column | Formula | Summary |
|---|---|---|
| Date | `{shipdate}` **[verify]** | Group |
| Lines ordered | `COUNT({line})` | Count |
| Lines shipped | `SUM(CASE WHEN {quantityshiprecv} >= {quantity} THEN 1 ELSE 0 END)` **[verify quantityshiprecv]** | Max |

(`{quantityshiprecv}` = quantity shipped/received against the line. Swap for a units-based fill rate by summing `{quantityshiprecv}` over `{quantity}` if you prefer units to line counts.)

**Target CSV columns:** `date`, `shipments_on_time`, `shipments_total`, `lines_shipped`, `lines_ordered`.

---

## Report 5 — Inventory Turns + Days on Hand

Turns is a flow ÷ stock ratio, so it needs two inputs from two places. Simplest path: one Item search for inventory value + the COGS figure off the standard Income Statement.

**Inventory value snapshot — Record type:** Item
- Criteria: Type → Inventory Item; inactive → false; location filter as needed

| Column | Field / Formula | Summary |
|---|---|---|
| On hand value | `{locationquantityonhand} * {averagecost}` **[verify]** | Sum |

**COGS (numerator):** pull period COGS from the Income Statement (or a Transaction search filtered to your COGS accounts, summing `{amount}`). Don't over-engineer this into the item search.

**Then compute (in the dashboard layer or a calc field):**
- `inventory_turns = COGS_period / average_inventory_value`
- `days_on_hand = 365 / inventory_turns` (or `average_inventory_value / (COGS_period / 365)`)

**Target CSV columns:** `inventory_turns`, `days_on_hand`.

---

## Report 6 — Stockouts

Two valid definitions — pick based on what the dashboard should signal.

**Point-in-time (items at zero) — Record type:** Item
- Criteria: Type → Inventory Item; `{locationquantityavailable}` ≤ 0 **[verify]**; location filter
- Result: `COUNT({internalid})` → stockout count

**Demand-impacting (back-ordered lines) — Record type:** Transaction
- Criteria: Type → Sales Order; `{quantitybackordered}` > 0 **[verify]**; Date within period
- Result: group by date, `COUNT({line})` → back-ordered lines/day

**Target CSV column:** `stockouts`.

---

## Report 7 — Inventory Accuracy (conditional — only if cycle counts are recorded)

Requires Smart Count / Inventory Count records in NetSuite. If Eagle isn't counting in NetSuite, this drops off and you're at six reports.

**Record type:** Inventory Count (or the count-detail record in your account) **[verify record + field IDs]**
- Criteria: Status → Completed; Date within period

| Column | Formula (Percent) | Summary |
|---|---|---|
| Accuracy % | `SUM(CASE WHEN {countquantity} = {systemquantity} THEN 1 ELSE 0 END) / NULLIF(COUNT({internalid}),0)` | Max |

For a variance-weighted version instead of pass/fail by line:
```
1 - ( SUM(ABS({countquantity} - {systemquantity})) / NULLIF(SUM({systemquantity}),0) )
```

**Target CSV column:** `inv_accuracy_pct`.

---

## What stays blank (no NetSuite source today)

| Dashboard field | Why it's blank | Source when ready |
|---|---|---|
| `downtime_minutes`, `downtime_reason` | Not in NetSuite | MES |
| `planned_minutes`, `ideal_rate_per_hr` | Not in NetSuite | MES / line master data |
| `good_units` (quality factor) | Quality not recorded | Quality capture at the line |
| `pick_lines_per_hr` | Labor hours not recorded | Labor/time capture |

**Consequence:** OEE (Availability × Performance × Quality) is the headline tile on Bottling and Straw, and **none of its three factors are NetSuite-sourceable**. NetSuite gives you built units and resin yield only. Flag or gray out OEE and pick-productivity tiles as "pending MES / labor / quality capture" rather than letting them render off partial data and read falsely green.
