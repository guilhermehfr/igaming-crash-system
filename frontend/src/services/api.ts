import { auth } from './auth'

const API_URL = '/api/games'
const WS_KONG = 'ws://localhost:8000'
const WS_FALLBACK = 'http://localhost:4001'

export interface RoundData {
  id: string
  state: 'BETTING' | 'RUNNING' | 'CRASHED'
  multiplier: number
  crashPoint: number | null
  bets: BetData[]
}

export interface BetData {
  id: string
  userId: string
  amountInCentavos: bigint
  multiplier: number | null
  status: 'PENDING' | 'CASHED_OUT' | 'LOST'
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = auth.getToken()
  
  if (!token) {
    throw new Error('No authentication token')
  }
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (res.status === 401) {
    auth.logout()
    throw new Error('Session expired')
  }
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed', status: res.status }))
    console.error('API error:', error)
    throw new Error(error.message || `Request failed (${res.status})`)
  }
  
  return res.json()
}

export async function getCurrentRound(): Promise<RoundData | null> {
  try {
    return await apiRequest<RoundData>('/current')
  } catch {
    return null
  }
}

export async function createRoundIfNeeded(): Promise<RoundData | null> {
  try {
    return await apiRequest<RoundData>('/rounds', { method: 'POST' })
  } catch {
    // Round might already exist, try to get current
    return getCurrentRound()
  }
}

export async function placeBet(amountInMainUnit: number): Promise<{ betId: string }> {
  const userId = auth.getUserId()
  return apiRequest<{ betId: string }>('/bets', {
    method: 'POST',
    body: JSON.stringify({ userId, amountInMainUnit }),
  })
}

export async function cashOut(betId: string, multiplier: number): Promise<BetData> {
  return apiRequest<BetData>(`/bets/${betId}/cash-out`, {
    method: 'POST',
    body: JSON.stringify({ multiplier }),
  })
}

export async function getRoundHistory(page = 1, limit = 10): Promise<RoundData[]> {
  return apiRequest<RoundData[]>(`/history?page=${page}&limit=${limit}`)
}

// Socket URL dengan fallback
export function getSocketUrl(): string {
  return WS_KONG
}

export function getSocketFallback(): string {
  return WS_FALLBACK
}