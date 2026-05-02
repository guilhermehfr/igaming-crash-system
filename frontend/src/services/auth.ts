const STORAGE_KEY = 'crash_game_token'
const DEV_USER_ID = 'dev-user'

interface AuthService {
  getToken(): string | null
  setToken(token: string): void
  isAuthenticated(): boolean
  logout(): void
  getUserId(): string
}

export const auth: AuthService = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  },
  
  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token)
  },
  
  isAuthenticated(): boolean {
    return !!this.getToken()
  },
  
  logout(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
  
  getUserId(): string {
    // In dev mode, map token to dev user
    // In production, extract from JWT claims
    const token = this.getToken()
    if (token && token.startsWith('dev-')) {
      return DEV_USER_ID
    }
    // TODO: Extract from JWT in production
    return DEV_USER_ID
  },
}

// Dev helper - set manual token
export function setDevToken(token: string) {
  auth.setToken(token)
}

// Dev helper - check if token exists
export function hasToken(): boolean {
  return auth.isAuthenticated()
}