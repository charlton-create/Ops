import crypto from "crypto";

/**
 * NetSuite SuiteTalk REST — SuiteQL client.
 *
 * Handles Token-Based Authentication (OAuth 1.0a, HMAC-SHA256 request signing)
 * server-side so credentials never reach the browser and CORS is avoided.
 * Used by /api/netsuite to feed the Eagle KPI dashboard.
 */

export interface NsCreds {
  account: string; // realm, e.g. "1234567" or "1234567_SB1"
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

export class NsConfigError extends Error {}

/** Read + validate NetSuite credentials from environment. Throws a clear error if any are missing. */
export function getCreds(): NsCreds {
  const account = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  const missing = Object.entries({
    NETSUITE_ACCOUNT_ID: account,
    NETSUITE_CONSUMER_KEY: consumerKey,
    NETSUITE_CONSUMER_SECRET: consumerSecret,
    NETSUITE_TOKEN_ID: tokenId,
    NETSUITE_TOKEN_SECRET: tokenSecret,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new NsConfigError(
      `NetSuite is not configured — missing env var(s): ${missing.join(", ")}. See NETSUITE_SETUP.md.`
    );
  }
  return {
    account: account!,
    consumerKey: consumerKey!,
    consumerSecret: consumerSecret!,
    tokenId: tokenId!,
    tokenSecret: tokenSecret!,
  };
}

/** RFC 3986 percent-encoding (encodeURIComponent leaves !*'() un-encoded). */
function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/** Account ID -> SuiteTalk REST host: lowercase, "_" -> "-". 1234567_SB1 -> 1234567-sb1 */
function accountHost(account: string): string {
  return account.toLowerCase().replace(/_/g, "-");
}

export function suiteqlUrl(account: string): string {
  return `https://${accountHost(account)}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
}

/**
 * Build the OAuth 1.0a Authorization header for a request.
 * `extraParams` must include any URL query params (e.g. limit/offset) — they are
 * part of the signature base string. The JSON body is NOT signed.
 * `overrides` lets tests inject a fixed nonce/timestamp for determinism.
 */
export function oauthHeader(
  method: string,
  baseUrl: string,
  creds: NsCreds,
  extraParams: Record<string, string> = {},
  overrides?: { nonce?: string; timestamp?: string }
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: overrides?.nonce ?? crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: overrides?.timestamp ?? Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.tokenId,
    oauth_version: "1.0",
  };

  const allParams = { ...oauth, ...extraParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(allParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    rfc3986(baseUrl),
    rfc3986(paramString),
  ].join("&");

  const signingKey = `${rfc3986(creds.consumerSecret)}&${rfc3986(creds.tokenSecret)}`;
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams: Record<string, string> = { ...oauth, oauth_signature: signature };
  const header =
    `OAuth realm="${rfc3986(creds.account)}", ` +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${rfc3986(k)}="${rfc3986(headerParams[k])}"`)
      .join(", ");
  return header;
}

/**
 * Run a SuiteQL query and return all rows (paginated). Each row is a plain
 * object keyed by the query's column aliases.
 */
export async function suiteql(
  q: string,
  creds: NsCreds = getCreds(),
  opts: { pageSize?: number; maxPages?: number } = {}
): Promise<Record<string, unknown>[]> {
  const pageSize = opts.pageSize ?? 1000;
  const maxPages = opts.maxPages ?? 20;
  const baseUrl = suiteqlUrl(creds.account);
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const params = { limit: String(pageSize), offset: String(offset) };
    const url = `${baseUrl}?limit=${pageSize}&offset=${offset}`;
    const auth = oauthHeader("POST", baseUrl, creds, params);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Prefer: "transient",
      },
      body: JSON.stringify({ q }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SuiteQL HTTP ${res.status}: ${text.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      items?: Record<string, unknown>[];
      hasMore?: boolean;
    };
    rows.push(...(json.items ?? []));
    if (!json.hasMore) break;
    offset += pageSize;
  }
  return rows;
}
