# Eagle KPI — BOM Components Saved Search (for Scrap % / Material Yield)

## Why this exists
The scrap KPI is a **material yield variance**:

```
theoretical use (per week) = Σ (units built × BOM qty per build)   ← this search provides the "qty per build"
actual use    (per week)   = opening on-hand + receipts − closing on-hand   ← from cycle counts (needs Item Count perm)
scrap / variance           = actual − theoretical
```

This saved search supplies the **standard component usage per finished good** — the "what the BOM says we should have consumed" half.

## Why a saved search (not SuiteQL)
NetSuite exposes `assemblyitembom` (assembly → BOM → current revision) to SuiteQL, but **not** the BOM component lines (`bomrevisioncomponent` and friends all 400). A saved search is the reliable way to get component rows; I'll map each BOM back to its finished good via `assemblyitembom`.

## Build it
**Reports → Saved Searches → New Saved Search → Bill of Materials Revision**
(If that type isn't offered, use **Bill of Materials**; if neither exposes components cleanly, an **Item** search filtered to assemblies with the member/component sublist also works — tell me and I'll adjust.)

**Criteria (filters):**
- `Inactive` = No
- Current revision only — use **`Bill of Materials Revision : Effective Date`** ≤ today **and** (`Obsolete Date` is empty OR ≥ today), or the "current revision" flag if present.

**Results (columns), in this order — keep labels simple:**
1. `Bill of Materials : Internal ID`  → label **bom_id**
2. `Bill of Materials : Name`         → label **bom_name**
3. `Component : Item : Internal ID`   → label **component_id**
4. `Component : Item` (name/number)   → label **component**
5. `Component : Quantity` (qty per one build of the assembly) → label **qty_per_build**
6. `Component : Units`                → label **uom**
7. *(optional)* `Component Yield %`   → label **yield_pct**

**Save**, then send me the search **ID** (e.g. `customsearch_eagle_bom_components`).

## What I do with it
1. Pull it via the existing proxy: `/api/netsuite?dataset=restlet&searchId=customsearch_eagle_bom_components`.
2. Join **BOM → finished-good assembly** via `assemblyitembom` (SuiteQL, already accessible), keeping only beverage/straw FG classes.
3. Weekly theoretical consumption per material = Σ over FGs built that week of `units_built × qty_per_build`.
4. Compare to actual (cycle-count deltas + receipts) → **scrap % / material-yield variance** per material, in weekly buckets.

## Gotchas
- **`qty_per_build` must be per ONE build of the assembly**, in the component's stock unit (each / lb), so it lines up with receipts and cycle counts.
- Beverage FGs can have two BOMs (Bottling vs Powder line); `assemblyitembom.currentrevision` picks the active one.
- If the Bill-of-Materials-Revision search won't load via the API ("unable to determine record type" — happened with the Item-Receipt search `customsearch4561`), we pivot to an **Item**-based component search.
- Still gated for the **actual** side: the SmartCount **Item Count / Item Count Details** role permission (for cycle-count on-hand). Add that and both Inventory Accuracy and this scrap calc go live.
