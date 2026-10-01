const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

let accessToken = localStorage.getItem("accessToken");
let refreshToken = localStorage.getItem("refreshToken");

export function setTokens(tokens: TokenPair | null) {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;
  if (tokens) {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

export function getRefreshToken() {
  return refreshToken;
}

async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error("No refresh token");
  }
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) {
    setTokens(null);
    throw new Error("Session expired");
  }
  const data = (await response.json()) as TokenPair;
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && retry && refreshToken) {
    const token = await refreshAccessToken();
    const retryHeaders = new Headers(headers);
    retryHeaders.set("Authorization", `Bearer ${token}`);
    return api<T>(path, { ...options, headers: retryHeaders }, false);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
