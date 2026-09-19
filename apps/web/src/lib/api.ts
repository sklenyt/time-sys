export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000/api/v1";

const ACCESS_TOKEN_KEY = "depo_access_token";
const REFRESH_TOKEN_KEY = "depo_refresh_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getTokens() {
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getTokens().accessToken !== null;
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && retry && (await refreshAccessToken())) {
    return request<T>(path, init, false);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Multipart upload — nikdy nenastavuje Content-Type ručně, prohlížeč doplní hranici (boundary). */
  postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
};

/** Perzistentní ID zařízení pro Local Capture / offline sync (viz docs/03-architecture.md §3.9). */
export function getDeviceId(): string {
  const KEY = "depo_zarizeni_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
