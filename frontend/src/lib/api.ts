import { config } from '@/config';

const AUTH_KEY = 'igaming-auth';

export async function apiFetch(url: string, opts?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string>),
  };

  const raw = localStorage.getItem(AUTH_KEY);
  if (raw) {
    try {
      const { id, token } = JSON.parse(raw);
      if (config.isDev) {
        headers['X-User-Id'] = id;
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // corrupted auth data, ignore
    }
  }

  return fetch(url, { ...opts, headers });
}
