import { useState, useEffect } from 'react'
import { Header } from './Header'
import { ActionPanel } from './ActionPanel'
import { MultiplierDisplay } from './MultiplierDisplay'
import { LiveBets } from './LiveBets'
import { auth, setDevToken } from '../services/auth'
import { 
  getCurrentRound, 
  placeBet, 
  cashOut, 
  createRoundIfNeeded,
} from '../services/api'
import { 
  connectSocket, 
  disconnectSocket, 
  setCurrentRoundId,
  on,
} from '../services/socket'
import { getWallet, type WalletData } from '../services/walletApi'

interface Bet {
  id: string
  username: string
  amount: string
  multiplier: string
  status: 'pending' | 'cashed' | 'lost'
}

interface GameUIState {
  state: 'BETTING' | 'RUNNING' | 'CRASHED'
  multiplier: number
  crashPoint: number | null
  betAmount: number | null
  userBetId: string | null
  cashedOutMultiplier: number | null
  roundId: string | null
  bets: Bet[]
  countdown: number | null
}

const initialState: GameUIState = {
  state: 'BETTING',
  multiplier: 1.0,
  crashPoint: null,
  betAmount: null,
  userBetId: null,
  cashedOutMultiplier: null,
  roundId: null,
  bets: [],
  countdown: null,
}

export function GameScreen() {
  const [gameData, setGameData] = useState<GameUIState>(initialState)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch wallet balance
  const refreshWallet = async () => {
    try {
      const walletData = await getWallet()
      setWallet(walletData)
    } catch (err) {
      console.error('Failed to fetch wallet:', err)
    }
  }

  // Hydrate from backend on mount
  useEffect(() => {
    async function hydrate() {
      try {
        // Check auth - set dev token if needed
        if (!auth.isAuthenticated()) {
          setDevToken('dev-token-123')
        }
        
        // Fetch wallet (financial source of truth)
        await refreshWallet()
        
        // Try to fetch current round
        try {
          const round = await getCurrentRound()
          
          if (round) {
            setGameData(prev => ({
              ...prev,
              state: round.state,
              multiplier: round.multiplier,
              crashPoint: round.crashPoint,
              roundId: round.id,
              bets: round.bets?.map(b => ({
                id: b.id,
                username: b.userId,
                amount: `$${(Number(b.amountInCentavos) / 100).toFixed(2)}`,
                multiplier: b.multiplier ? `${b.multiplier.toFixed(2)}x` : '-',
                status: b.status === 'CASHED_OUT' ? 'cashed' as const : 
                       b.status === 'PENDING' ? 'pending' as const : 'lost' as const
              })) || []
            }))
            
            setCurrentRoundId(round.id)
          }
        } catch (apiErr) {
          // No active round is OK - show BETTING waiting state
          console.log('No active round, showing BETTING state')
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Hydration error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load game')
        setLoading(false)
      }
    }
    
    hydrate()
  }, [])

  // Connect WebSocket untuk dapat state dari backend
  useEffect(() => {
    if (loading || error) return
    
    connectSocket()
    
    // Listen to state changes
    on('round:state-changed', (data: any) => {
      setGameData(prev => ({
        ...prev,
        state: data.state,
        crashPoint: data.crashPoint,
        roundId: data.roundId
      }))
      setCurrentRoundId(data.roundId)
    })
  
    // Listen to multiplier updates
    on('round:multiplier-updated', (data: any) => {
      setGameData(prev => ({
        ...prev,
        multiplier: data.multiplier
      }))
    })
  
    // Listen to crash
    on('round:crashed', (data: any) => {
      setGameData(prev => ({
        ...prev,
        state: 'CRASHED',
        multiplier: data.crashPoint,
        crashPoint: data.crashPoint
      }))
    })
  
    // Listen to bets
    on('round:bet-placed', (data: any) => {
      setGameData(prev => ({
        ...prev,
        bets: [...prev.bets, {
          id: data.bet.id,
          username: data.bet.userId,
          amount: `$${(Number(data.bet.amountInCentavos) / 100).toFixed(2)}`,
          multiplier: '-',
          status: 'pending' as const
        }]
      }))
    })
  
    on('round:bet-cashed-out', (data: any) => {
      setGameData(prev => ({
        ...prev,
        bets: prev.bets.map(b => 
          b.id === data.bet.id 
            ? { ...b, multiplier: `${data.bet.multiplier?.toFixed(2)}x`, status: 'cashed' as const }
            : b
        )
      }))
    })
    
    return () => {
      disconnectSocket()
    }
  }, [loading, error])

  // Place Bet action - wallet is debited by backend
  const handlePlaceBet = async (amount: number = 0) => {
    if (actionLoading) return
    setActionLoading(true)
    
    try {
      // Get current round
      let currentRound = await getCurrentRound()
      
      // If no round OR not BETTING, create new round
      if (!currentRound || currentRound.state !== 'BETTING') {
        console.log('Creating new round...')
        await createRoundIfNeeded()
        // Small delay to let round initialize
        await new Promise(r => setTimeout(r, 100))
        currentRound = await getCurrentRound()
      }
      
      // Final check: can we place bet?
      if (!currentRound || currentRound.state !== 'BETTING') {
        throw new Error(`Cannot place bet - round is ${currentRound?.state || 'unavailable'}`)
      }
      
      // Update UI state to match round
      setGameData(prev => ({
        ...prev,
        state: currentRound.state,
        multiplier: currentRound.multiplier,
        crashPoint: currentRound.crashPoint,
        roundId: currentRound.id,
      }))
      
      const { betId } = await placeBet(amount)
      
      // Fetch updated round to get latest bets
      const updatedRound = await getCurrentRound()
      if (updatedRound) {
        setGameData(prev => ({
          ...prev,
          state: updatedRound.state,
          multiplier: updatedRound.multiplier,
          crashPoint: updatedRound.crashPoint,
          roundId: updatedRound.id,
          betAmount: amount,
          userBetId: betId,
          bets: updatedRound.bets?.map(b => ({
            id: b.id,
            username: b.userId,
            amount: `$${(Number(b.amountInCentavos) / 100).toFixed(2)}`,
            multiplier: b.multiplier ? `${b.multiplier.toFixed(2)}x` : '-',
            status: b.status === 'CASHED_OUT' ? 'cashed' as const : 
                   b.status === 'PENDING' ? 'pending' as const : 'lost' as const
          })) || []
        }))
      }
      
      // Sync wallet after bet (backend debits wallet)
      await refreshWallet()
    } catch (err) {
      console.error('Place bet error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Cash Out action - wallet is credited by backend
  const handleCashOut = async () => {
    if (!gameData.userBetId || !gameData.roundId || actionLoading) return
    setActionLoading(true)
    
    try {
      await cashOut(gameData.userBetId, gameData.multiplier)
      setGameData(prev => ({
        ...prev,
        cashedOutMultiplier: prev.multiplier
      }))
      // Sync wallet after cashout (backend credits wallet)
      await refreshWallet()
    } catch (err) {
      console.error('Cash out error:', err)
    } finally {
      setActionLoading(false)
    }
  }

// Auto-cycle runs in backend - no manual Play Again needed
  // Dev: Set token if needed
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      setDevToken('dev-token-123')
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161A1E] flex items-center justify-center">
        <span className="text-[#00FF7F]">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#161A1E] flex items-center justify-center">
        <span className="text-red-500">Error: {error}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161A1E] flex flex-col">
      <Header walletBalance={wallet?.balanceInCentavos} />
      
      {/* Mobile: Live bets button after header */}
      <div className="md:hidden px-4 pt-12">
        <button 
          onClick={() => {}}
          className="w-full py-2 bg-[#1D2023] border border-[rgba(59,75,60,0.2)] rounded-lg text-sm text-[#B9CBB8]"
        >
          View Live Bets ({gameData.bets.length})
        </button>
      </div>

      <main className="flex-1 pt-12 md:pt-20 px-0 md:px-0 flex flex-col md:flex-row justify-between h-[calc(100vh-48px)] md:h-auto">
        {/* LiveBets - visible when there are bets or in RUNNING/CRASHED */}
        {(gameData.bets.length > 0 || gameData.state === 'RUNNING' || gameData.state === 'CRASHED') && (
          <div className="hidden md:block md:w-[378px] bg-[#161A1E] md:fixed md:left-0 md:top-12 md:bottom-0">
            <LiveBets playerCount={gameData.bets.length} bets={gameData.bets} />
          </div>
        )}

        {/* Multiplier */}
        <div className="flex-1 flex items-start justify-center py-4 md:py-20 md:ml-[378px] md:mr-[378px]">
          <MultiplierDisplay 
            multiplier={gameData.multiplier}
            state={gameData.state}
            cashedOutMultiplier={gameData.cashedOutMultiplier}
            countdown={gameData.countdown}
          />
        </div>

        {/* ActionPanel - mobile always visible */}
        <div className="md:hidden bg-[#161A1E] pb-24">
          <ActionPanel 
            state={gameData.state}
            multiplier={gameData.multiplier}
            betAmount={gameData.betAmount}
            cashedOutMultiplier={gameData.cashedOutMultiplier}
            loading={actionLoading}
            onPlaceBet={handlePlaceBet}
            onCashOut={handleCashOut}
          />
        </div>

        {/* ActionPanel - desktop */}
        <div className="hidden md:block md:w-[378px] bg-[#161A1E] md:fixed md:right-0 md:top-12 md:bottom-0">
          <ActionPanel 
            state={gameData.state}
            multiplier={gameData.multiplier}
            betAmount={gameData.betAmount}
            cashedOutMultiplier={gameData.cashedOutMultiplier}
            loading={actionLoading}
            onPlaceBet={handlePlaceBet}
            onCashOut={handleCashOut}
          />
        </div>
      </main>
    </div>
  )
}