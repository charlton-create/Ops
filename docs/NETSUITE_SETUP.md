# NetSuite → Eagle KPI Dashboard (live API)

This wires the KPI dashboard to NetSuite over the API instead of manual CSV exports.
A server-side proxy (`/api/netsuite`) signs the OAuth 1.0a request, runs SuiteQL, and
returns dashboard-ready JSON — so credentials never reach the browser and there are no
CORS problems.

> Field-by-field mapping logic lives in the companion guide:
> [`Eagle_KPI_NetSuite_SavedSearch_Build_Guide.md`](./Eagle_KPI_NetSuite_SavedSearch_Build_Guide.md)

## What's built

| File | Role |
|---|---|
| `src/lib/netsuite/client.ts` | OAuth 1.0a (HMAC-SHA256) signing + SuiteQL executor (paginated) |
| `src/lib/netsuite/queries.ts` | Dataset → SuiteQL + row mapper (account-specific bits are `/* VERIFY */` or env-overridable) |
| `src/app/api/netsuite/route.ts` | `GET /api/netsuite?dataset=…&start=…&end=…` (auth-protected) |

## Step 1 — Enable NetSuite features
**Setup > Company > Enable Features:**
- **SuiteCloud** tab → check **SuiteTalk (SOAP & REST Web Services)** and **REST Web Services**
- **SuiteCloud** tab → check **Token-Based Authentication**

## Step 2 — Create an Integration record (consumer key/secret)
**Setup > Integration > Manage Integrations > New**
- Name: `Eagle KPI Dashboard`
- Check **Token-Based Authentication**; uncheck the TBA authorization flow / OAuth 2.0 if not needed
- Save → copy the **Consumer Key** and **Consumer Secret** (shown once)

## Step 3 — Create an Access Token (token id/secret)
**Setup > Users/Roles > Access Tokens > New**
- Application = the integration from Step 2
- User = a service/integration user; Role = one with **SuiteQL / SuiteAnalytics Workbook** + read access to Transactions, Items, etc.
- Save → copy the **Token ID** and **Token Secret** (shown once)

## Step 4 — Set environment variables
Add to `.env` (local) and to the deployment env (e.g. `vercel env add`). Never commit real values.

```
NETSUITE_ACCOUNT_ID=1234567_SB1      # account id / realm (prod has no suffix)
NETSUITE_CONSUMER_KEY=...
NETSUITE_CONSUMER_SECRET=...
NETSUITE_TOKEN_ID=...
NETSUITE_TOKEN_SECRET=...
```

## Step 5 — Confirm the account-specific fields (`[verify]`)
The scaffolded SuiteQL needs three things checked against your account:

1. **Production line field** — NetSuite has no native line field. Set `NETSUITE_LINE_FIELD`
   to whichever carries Line 1–4 / Extruder A–C: `tl.class`, `tl.department`, `tl.location`,
   or a custom `tl.custcol_…`.
2. **Bottling vs straw split** — uncomment the item/class filter in `queries.ts` so each
   dashboard pulls its own builds.
3. **Expected dates for on-time %** — receiving/shipping on-time needs the expected
   receipt/ship date, usually via a join to the source PO/SO line. Until confirmed, the
   warehouse query returns volumes with on-time = 0.

**Easiest path:** rather than editing `queries.ts`, paste a verified SuiteQL string into
`NETSUITE_SQL_BOTTLING` / `NETSUITE_SQL_STRAW` / `NETSUITE_SQL_WAREHOUSE` (use the literal
tokens `{start}` and `{end}` for the date range). Column aliases should match the dashboard
template headers (`date`, `line`, `total_units`, `resin_used_kg`, `receipts_total`, …).

## Step 6 — Test
The route is auth-protected. Log into the app (dev: `admin` / `admin`), then:

```
curl 'http://localhost:3000/api/netsuite?dataset=bottling&start=2026-03-01&end=2026-06-21' \
  -H "Cookie: <your session cookie>"
```

- `503` → env vars not set (message names the missing one)
- `502` → reached NetSuite but the query/auth failed (message includes NetSuite's response — usually a field name or permission to fix)
- `200` → `{ dataset, count, data: [...] }`

## What goes live vs. stays pending

| Live from NetSuite | Pending (not in NetSuite) |
|---|---|
| Production output (built units) | OEE + its factors (Availability, Performance, Quality) |
| Straw resin used (Material Yield once standard is added) | Downtime minutes / reason, planned minutes, ideal rate → **MES** |
| Receiving / shipping volume (on-time once expected dates confirmed) | First Pass Yield / `good_units` → **quality capture** |
| Inventory turns, days on hand, stockouts, accuracy* | Pick productivity (lines/hr) → **labor capture** |

\*Inventory turns/accuracy need extra item-level + COGS + cycle-count queries — see guide
Reports 5–7; add them as additional `NETSUITE_SQL_*` overrides or new entries in `queries.ts`.

**Important:** OEE is the headline tile on Bottling and Straw, and none of its three factors
are NetSuite-sourceable. Keep those tiles flagged "pending MES" rather than letting them
render off partial data and read falsely.
