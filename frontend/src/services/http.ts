// Thin fetch wrapper for the real Django backend. Only the endpoints that are
// wired to the real API (auth, robots, dashboard) go through this; everything
// else still reads from mock.ts until it gets its own backend pass.
const BASE_URL = 'http://localhost:8000/api';
const TOKEN_KEY = 'pguard-token';
// ponytail: floors every request at 300ms so the skeleton shimmer stays
// perceptible on a fast local backend; drop this once real network latency
// makes it unnecessary.
const MIN_LATENCY_MS = 300;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const started = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const elapsed = Date.now() - started;
  if (elapsed < MIN_LATENCY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_LATENCY_MS - elapsed));
  }
  if (res.status === 401) {
    setToken(null);
    throw new Error('Session expirée, veuillez vous reconnecter');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Erreur serveur (${res.status})`);
  }
  return res.json() as Promise<T>;
}
