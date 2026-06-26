const AUTH_KEY = 'igaming-auth';
const DEMO_SESSION_KEY = 'igaming-demo-session';

export async function apiFetch(url: string, opts?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string>),
  };

  const demoSessionId = sessionStorage.getItem(DEMO_SESSION_KEY);
  if (demoSessionId) {
    headers['X-Demo-Session'] = demoSessionId;
  }

  const raw = localStorage.getItem(AUTH_KEY);
  if (raw) {
    try {
      const { id, token } = JSON.parse(raw);
      headers['X-User-Id'] = id;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // corrupted auth data, ignore
    }
  }

  return fetch(url, { ...opts, headers });
}
