import { auth } from './auth'

// Use Kong proxy through Vite
const WALLET_API_URL = '/api/wallets'

async function walletApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${WALLET_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'Request failed')
  }
  
  return res.json()
}

export interface WalletData {
  id: string
  userId: string
  balanceInCentavos: bigint
  balanceInMainUnit: number
  createdAt: string
  updatedAt: string
}

// Get wallet by userId (dev token maps to dev-user)
export async function getWallet(userId?: string): Promise<WalletData> {
  const targetUserId = userId || auth.getUserId()
  return walletApiRequest<WalletData>(`/${targetUserId}`)
}

// Create wallet with initial balance
export async function createWallet(userId: string, initialBalance = 10000): Promise<WalletData> {
  return walletApiRequest<WalletData>('', {
    method: 'POST',
    body: JSON.stringify({ 
      userId, 
      initialBalanceInMainUnit: initialBalance 
    }),
  })
}

// Refresh wallet - wrapper around getWallet
export async function refreshWallet(userId?: string): Promise<WalletData> {
  try {
    return await getWallet(userId)
  } catch {
    // If wallet doesn't exist, create one with default balance
    const targetUserId = userId || auth.getUserId()
    return await createWallet(targetUserId, 10000)
  }
}