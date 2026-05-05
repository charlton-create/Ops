const TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";
const API_BASE = "https://www.zohoapis.com/books/v3";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getEnv("ZOHO_PAY_CLIENT_ID"),
      client_secret: getEnv("ZOHO_PAY_CLIENT_SECRET"),
      refresh_token: getEnv("ZOHO_BOOKS_REFRESH_TOKEN"),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

function orgId(): string {
  return getEnv("ZOHO_BOOKS_ORG_ID");
}

export async function zohoGet<T = any>(path: string): Promise<T> {
  const token = await getAccessToken();
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}organization_id=${orgId()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho GET ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

export async function zohoPost<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  const url = `${API_BASE}${path}?organization_id=${orgId()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho POST ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

export async function zohoPing(): Promise<{ ok: boolean; org: string; error?: string }> {
  try {
    const data = await zohoGet<any>("/organizations");
    const org = data.organizations?.[0];
    return { ok: true, org: org?.name ?? "unknown" };
  } catch (err: any) {
    return { ok: false, org: "", error: err.message };
  }
}
