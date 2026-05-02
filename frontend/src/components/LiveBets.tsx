export type BetStatus = 'pending' | 'cashed' | 'lost'

export interface Bet {
  id: string
  username: string
  amount: string
  multiplier?: string
  status: BetStatus
}

interface LiveBetsProps {
  playerCount?: number
  bets: Bet[]
}

function BetRow({ bet }: { bet: Bet }) {
  const statusColors = {
    pending: {
      bg: '#52525B',
      text: '#71717A',
    },
    cashed: {
      bg: '#00FF7F',
      text: '#00FF7F',
    },
    lost: {
      bg: '#FFB4A5',
      text: '#FFB4A5',
    },
  }

  const colors = statusColors[bet.status]

  return (
    <div className="flex items-center justify-center gap-1 bg-white/[0.02] rounded px-2 py-3">
      <div className="w-20 md:w-[108px] flex-shrink-0">
        <span className="text-xs md:text-sm text-[#E1E2E7] truncate block">{bet.username}</span>
      </div>
      <div className="w-16 md:w-[83px] py-3 px-1 flex-shrink-0">
        <span className="text-xs md:text-sm text-[#B9CBB8]">{bet.amount}</span>
      </div>
      <div className="w-12 md:w-[67px] flex items-center justify-end gap-2 flex-shrink-0">
        <span
          className="text-xs md:text-sm font-bold"
          style={{ color: colors.text, textAlign: 'right' }}
        >
          {bet.status === 'pending' ? '-' : bet.multiplier}
        </span>
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.bg }}
        />
      </div>
    </div>
  )
}

export function LiveBets({ playerCount = 0, bets = [] }: LiveBetsProps) {
  return (
    <aside className="w-full md:w-[378px] h-full md:h-auto bg-[#161A1E] md:border md:border-[rgba(59,75,60,0.2)] backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between p-3 md:p-4 bg-[#0B0E1180] border-b border-[rgba(59,75,60,0.2)]">
        <span className="text-xs md:text-sm font-space-grotesk font-normal text-[#B9CBB8] tracking-[10%] uppercase">
          Live Bets
        </span>
        <div className="px-2 py-0.5 rounded-full bg-[#00FF7F1A]">
          <span className="text-xs text-[#00FF7F]">{playerCount} Playing</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 md:gap-2 p-2 md:p-4 overflow-x-auto">
        {bets.map((bet) => (
          <BetRow key={bet.id} bet={bet} />
        ))}
      </div>
    </aside>
  )
}