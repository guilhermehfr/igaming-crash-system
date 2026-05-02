export type GameState = 'BETTING' | 'RUNNING' | 'CRASHED'

export interface GameData {
  multiplier: number
  betAmount: number | null
}