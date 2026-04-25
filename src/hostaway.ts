/**
 * Hostaway API client.
 *
 * Hostaway uses OAuth 2.0 client credentials flow. The user supplies
 * HOSTAWAY_ACCOUNT_ID (= client_id) and HOSTAWAY_API_KEY (= client_secret).
 * We exchange those for a bearer token at startup, cache it (24-month
 * validity), and refresh once on a 401.
 *
 * Docs: https://api.hostaway.com/documentation
 */

const BASE_URL = "https://api.hostaway.com/v1";

interface AccessTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function readCredentials(): { accountId: string; apiKey: string } {
  const accountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const apiKey = process.env.HOSTAWAY_API_KEY;
  if (!accountId || !apiKey) {
    throw new Error(
      "Missing Hostaway credentials. Set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_API_KEY env vars."
    );
  }
  return { accountId, apiKey };
}

async function mintAccessToken(): Promise<CachedToken> {
  const { accountId, apiKey } = readCredentials();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: accountId,
    client_secret: apiKey,
    scope: "general",
  });

  const res = await fetch(`${BASE_URL}/accessTokens`, {
    method: "POST",
    headers: {
      "Cache-control": "no-cache",
      "Content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Hostaway auth failed: ${res.status} ${res.statusText} — ${text}`
    );
  }

  const data = (await res.json()) as AccessTokenResponse;
  // expires_in is in seconds; subtract a 60s safety margin
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return { token: data.access_token, expiresAt };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  cachedToken = await mintAccessToken();
  return cachedToken.token;
}

interface HostawayResponse<T> {
  status: string;
  result: T;
  count?: number;
  limit?: number;
  offset?: number;
}

/**
 * Authenticated fetch against the Hostaway public API.
 *
 * On 401, the cached token is dropped and the request is retried once
 * with a fresh token. Throws on any non-2xx response after that retry.
 */
export async function hostawayFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const doRequest = async (): Promise<Response> => {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Cache-control", "no-cache");
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    return fetch(url, { ...init, headers });
  };

  let res = await doRequest();
  if (res.status === 401) {
    cachedToken = null;
    res = await doRequest();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Hostaway API ${init.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText} — ${text}`
    );
  }

  const data = (await res.json()) as HostawayResponse<T>;
  return data.result;
}

/** Build a query string from a record, skipping undefined / null values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}
