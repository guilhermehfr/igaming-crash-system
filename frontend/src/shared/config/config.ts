export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  isDev: import.meta.env.DEV,
};
