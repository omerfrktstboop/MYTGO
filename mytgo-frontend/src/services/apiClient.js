const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "mytgo_access_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = options.token ?? getStoredToken();
  const body =
    options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
    body,
  });

  if (!response.ok) {
    let detail = `MYTGO API request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // Keep the generic failure when the backend did not return JSON.
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}
