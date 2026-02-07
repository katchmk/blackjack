import { twMerge } from 'tailwind-merge'

interface TurnTimerProps {
  seconds: number | null
  label?: string
}

export function TurnTimer({ seconds, label }: TurnTimerProps) {
  if (seconds === null) return null

  const isLow = seconds <= 5
  const isVeryLow = seconds <= 3

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-white/60 text-sm">{label}</span>}
      <div
        className={twMerge(
          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-colors',
          isVeryLow && 'border-red-500 text-red-400 animate-pulse',
          isLow && !isVeryLow && 'border-yellow-500 text-yellow-400',
          !isLow && 'border-white/30 text-white/80'
        )}
      >
        {seconds}
      </div>
    </div>
  )
}
