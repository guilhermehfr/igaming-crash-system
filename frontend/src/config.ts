export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
