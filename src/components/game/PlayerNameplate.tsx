import { twMerge } from 'tailwind-merge'

interface PlayerNameplateProps {
  name: string
  isActive: boolean
  isCurrentUser: boolean
}

export function PlayerNameplate({ name, isActive, isCurrentUser }: PlayerNameplateProps) {
  return (
    <div
      className={twMerge(
        'text-xs font-bold px-2 py-0.5 rounded-full truncate max-w-[100px] text-center',
        isCurrentUser ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/10 text-white/70',
        isActive && 'ring-1 ring-green-400'
      )}
    >
      {name}
    </div>
  )
}
