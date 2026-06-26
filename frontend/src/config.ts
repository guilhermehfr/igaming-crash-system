export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
