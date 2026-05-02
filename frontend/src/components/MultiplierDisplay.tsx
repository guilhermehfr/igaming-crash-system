interface MultiplierDisplayProps {
  multiplier: number
  state: 'BETTING' | 'RUNNING' | 'CRASHED'
  cashedOutMultiplier?: number | null
  countdown?: number | null
}

export function MultiplierDisplay({ 
  multiplier,
  state,
  cashedOutMultiplier,
  countdown
}: MultiplierDisplayProps) {
  // If player cashed out, show that multiplier permanently
  const safeMultiplier = multiplier ?? 1
  const displayValue = cashedOutMultiplier 
    ? cashedOutMultiplier.toFixed(2) + 'x'
    : safeMultiplier.toFixed(2) + 'x'
  
  const isGreen = state !== 'CRASHED'
  const textColor = isGreen ? '#00FF7F' : '#FF4444'
  const shadowColor = isGreen 
    ? '0px 0px 60px rgba(0, 255, 127, 0.4), 0px 0px 30px rgba(0, 255, 127, 0.7)'
    : '0px 0px 60px rgba(255, 68, 68, 0.4), 0px 0px 30px rgba(255, 68, 68, 0.7)'
  
  // Show countdown in BETTING state
  const countdownText = (countdown !== null && countdown !== undefined && countdown > 0) ? `${Math.ceil(countdown)}s` : null

  return (
    <div className="flex flex-col items-center justify-center">
      {countdownText && (
        <span className="text-2xl md:text-3xl text-[#FF4444] mb-2">
          Next round in: {countdownText}
        </span>
      )}
      <span
        className="text-8xl md:text-9xl lg:text-[140px] xl:text-[160px] font-space-grotesk font-bold whitespace-nowrap leading-none"
        style={{
          color: textColor,
          textShadow: shadowColor,
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}