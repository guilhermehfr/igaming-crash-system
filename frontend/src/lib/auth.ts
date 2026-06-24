import { config } from '@/config';

export type AuthResult = {
  userId: string;
  email: string;
  token?: string;
};

export async function keycloakLogin(email: string, password: string): Promise<AuthResult> {
  const params = new URLSearchParams({
    client_id: 'crash-game-client',
    grant_type: 'password',
    username: email,
    password,
  });

  const res = await fetch(`${config.keycloakUrl}/realms/crash-game/protocol/openid-connect/token`, {
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
    email: (payload.email as string) ?? email,
    token,
  };
}
