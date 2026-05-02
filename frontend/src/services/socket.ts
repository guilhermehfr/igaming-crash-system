import { io, Socket } from 'socket.io-client'
import { auth } from './auth'

const WS_GAMES = 'ws://localhost:4001'

interface StateChangedData {
  roundId: string
  state: 'BETTING' | 'RUNNING' | 'CRASHED'
  crashPoint: number | null
}

interface MultiplierUpdatedData {
  roundId: string
  multiplier: number
}

interface CrashedData {
  roundId: string
  crashPoint: number
  stats: any
}

interface BetPlacedData {
  roundId: string
  bet: any
}

interface BetCashedOutData {
  roundId: string
  bet: any
}

type GameEventData = StateChangedData | MultiplierUpdatedData | CrashedData | BetPlacedData | BetCashedOutData

let socket: Socket | null = null
let currentRoundId: string | null = null

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket
  }
  
  const token = auth.getToken()
  if (!token) {
    throw new Error('No authentication token')
  }
  
  socket = io(WS_GAMES, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  })
  
  socket.on('connect_error', (err) => {
    console.log('Socket connect error:', err.message)
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    currentRoundId = null
  }
}

export function getSocket(): Socket | null {
  return socket
}

export function setCurrentRoundId(roundId: string): void {
  currentRoundId = roundId
}

export function getCurrentRoundId(): string | null {
  return currentRoundId
}

// Validate roundId to prevent race conditions
export function isValidEvent(roundId: string): boolean {
  return roundId === currentRoundId
}

export function on(event: string, handler: (data: GameEventData) => void): void {
  if (!socket) return
  
  // Wrap handler with roundId validation
  const validatedHandler = (data: GameEventData) => {
    if (data && 'roundId' in data && !isValidEvent(data.roundId)) {
      return
    }
    handler(data)
  }
  
  socket.on(event, validatedHandler)
}

export function off(event: string): void {
  if (!socket) return
  socket.off(event)
}

export function isConnected(): boolean {
  return socket?.connected ?? false
}