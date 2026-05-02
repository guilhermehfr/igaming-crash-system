import { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export interface ActionPanelProps {
  state?: 'BETTING' | 'RUNNING' | 'CRASHED'
  multiplier?: number
  betAmount?: number | null
  cashedOutMultiplier?: number | null
  loading?: boolean
  onPlaceBet?: (amount: number) => void
  onCashOut?: () => void
}

export function ActionPanel({
  state = 'BETTING',
  multiplier = 1.0,
  betAmount = null,
  cashedOutMultiplier = null,
  loading = false,
  onPlaceBet,
  onCashOut,
}: ActionPanelProps) {
  const [inputAmount, setInputAmount] = useState(0)
  // Calculate potential win
  const currentMultiplier = cashedOutMultiplier ?? multiplier
  const potentialWin = betAmount 
    ? (betAmount * currentMultiplier).toFixed(2)
    : '0.00'
  
  // Button text based on state and bet amount
  const buttonText = state === 'BETTING' 
    ? 'PLACE BET' 
    : state === 'RUNNING' 
      ? (betAmount !== null && betAmount > 0) ? 'CASH OUT' : 'WAIT NEXT ROUND'
      : 'CRASHED'
  
  const buttonColor = state === 'CRASHED' ? '#FF4444' : '#00FF7F'
  const buttonShadow = state === 'CRASHED'
    ? '0px 0px 40px rgba(255, 68, 68, 0.3)'
    : '0px 0px 40px rgba(0, 255, 127, 0.3)'

  const handleButtonClick = () => {
    // Validate bet amount - allow 0 for watch-only
    if (state === 'BETTING' && inputAmount < 0) {
      toast.dismiss()
      toast.warn('Bet value cannot be negative')
      return
    }
    
    if (state === 'BETTING' && onPlaceBet) {
      onPlaceBet(inputAmount)
    } else if (state === 'RUNNING' && onCashOut && betAmount !== null && betAmount > 0) {
      // Only allow cash out if user has a real bet (> 0)
      onCashOut()
    }
  }

  return (
    <aside className="w-full md:w-[378px] h-full md:min-h-[calc(100vh-80px)] bg-[#161A1E] md:border md:border-[rgba(59,75,60,0.2)] md:rounded-lg backdrop-blur-xl p-4 flex flex-col gap-2">
      <ToastContainer position="top-center" theme="dark" autoClose={3000} />
      {/* Potential Win - only show if bet placed */}
      {betAmount !== null && (
        <div className="bg-[#272A2ECC] rounded-lg p-2 flex flex-col gap-2">
          <div className="flex justify-between items-center py-1">
            <span className="text-sm md:text-base text-[#A1A1AA]">
              {cashedOutMultiplier ? 'Cashed at' : 'Potential'}
            </span>
            <span className="text-sm md:text-base font-space-grotesk font-black text-[#00FF7F]">
              ${potentialWin}
            </span>
          </div>
        </div>
      )}

      {/* Main Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={
          loading || 
          state === 'CRASHED' ||
          (state === 'RUNNING' && (betAmount === null || betAmount === 0))
        }
        className="relative overflow-hidden w-full h-20 md:h-32 rounded-2xl flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: buttonColor,
          boxShadow: buttonShadow,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="absolute top-[-32px] left-[68px] w-32 md:w-48 h-32 md:h-48 bg-white/20 blur-[64px]" />
        <span 
          className="relative z-10 text-2xl md:text-[36px] font-space-grotesk font-black tracking[-5%]"
          style={{ color: state === 'CRASHED' ? '#7A1F1F' : '#007134' }}
        >
          {state === 'CRASHED' ? 'CRASHED' : buttonText}
        </span>
        {betAmount !== null && state === 'RUNNING' && !cashedOutMultiplier && (
          <span 
            className="relative z-10 text-sm md:text-xl font-space-grotesk font-bold opacity-80"
            style={{ color: '#007134' }}
          >
            ${potentialWin}
          </span>
        )}
        {cashedOutMultiplier && (
          <span 
            className="relative z-10 text-sm md:text-xl font-space-grotesk font-bold opacity-80"
            style={{ color: '#007134' }}
          >
            ${potentialWin}
          </span>
        )}
      </button>

      {/* Bet Input - only in BETTING */}
      {state === 'BETTING' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-space-grotesk font-normal uppercase text-[#71717A] tracking-wide">
                Next Bet
              </span>
              <div className="flex items-center justify-center bg-[#1D2023] border border-[rgba(59,75,60,0.2)] rounded-lg px-4 py-2">
                <span className="text-[10px] text-[#71717A]">$</span>
<input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-base text-[#E1E2E7] font-space-grotesk font-normal text-center outline-none px-3 py-1"
                />
              </div>
            </label>
          </div>

          {/* Quick Controls */}
          <div className="flex justify-between gap-2 h-10">
            <button 
              type="button" 
              onClick={() => setInputAmount(Math.max(0, inputAmount - 10))}
              className="flex-1 flex flex-col items-center justify-center bg-[#191C1F] border border-[rgba(59,75,60,0.2)] rounded active:bg-[#272A2E]"
            >
              <span className="text-2xl md:text-3xl leading-none text-[#E1E2E7]">-</span>
              <span className="text-xs text-white/50">10</span>
            </button>
            <button 
              type="button" 
              onClick={() => setInputAmount(inputAmount * 2)}
              className="flex-1 flex flex-col items-center justify-center bg-[#191C1F] border border-[rgba(59,75,60,0.2)] rounded active:bg-[#272A2E]"
            >
              <span className="text-lg md:text-xl text-[#E1E2E7]">2x</span>
            </button>
            <button 
              type="button" 
              onClick={() => setInputAmount(inputAmount + 10)}
              className="flex-1 flex flex-col items-center justify-center bg-[#191C1F] border border-[rgba(59,75,60,0.2)] rounded active:bg-[#272A2E]"
            >
              <span className="text-2xl md:text-3xl leading-none text-[#E1E2E7]">+</span>
              <span className="text-xs text-white/50">10</span>
            </button>
          </div>
        </>
      )}
    </aside>
  )
}