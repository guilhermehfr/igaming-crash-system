import { config } from '@/config';

export type AuthResult = {
  userId: string;
  username: string;
  token?: string;
};

export async function keycloakLogin(username: string, password: string): Promise<AuthResult> {
  const base = config.apiUrl || '';
  const params = new URLSearchParams({
    client_id: 'crash-game-client',
    grant_type: 'password',
    username,
    password,
  });

  const res = await fetch(`${base}/auth/realms/crash-game/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    throw new Error('Invalid credentials');
  }

  const data = await res.json();
  const token: string = data.access_token;
  const payload = JSON.parse(atob(token.split('.')[1]));

  return {
    userId: payload.sub as string,
    username: (payload.preferred_username as string) ?? username,
    token,
  };
}
