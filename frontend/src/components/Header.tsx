interface HeaderProps {
  walletBalance?: bigint | null
}

export function Header({ walletBalance }: HeaderProps) {
  const balanceText = walletBalance 
    ? `$${(Number(walletBalance) / 100).toFixed(2)}`
    : '---'

  return (
    <header className="fixed top-0 left-0 right-0 h-12 px-3 md:px-6 flex items-center justify-between bg-[#0B0E11CC] backdrop-blur-xl border-b border-[#161A1E] z-50">
      <div className="flex items-center">
        <h1 className="font-space-grotesk text-base md:text-xl font-bold text-[#00FF7F] tracking[-5%]">
          IGAMING CRASH
        </h1>
      </div>

      <div className="flex flex-col items-end gap-0">
        <span className="text-[8px] md:text-xs font-space-grotesk text-[#B9CBB8] leading-none">USER</span>
        <span className="text-xs md:text-base font-space-grotesk font-normal text-[#00FF7F] tracking[-2.5%]">
          {balanceText}
        </span>
      </div>
    </header>
  )
}