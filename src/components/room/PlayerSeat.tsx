import { twMerge } from 'tailwind-merge'
import type { RoomPlayer } from '../../hooks/useRoom'

interface PlayerSeatProps {
  spotIndex: number
  player: RoomPlayer | null
  isCurrentUser: boolean
  canJoin: boolean
  onJoin: (spotIndex: number) => void
}

export function PlayerSeat({ spotIndex, player, isCurrentUser, canJoin, onJoin }: PlayerSeatProps) {
  if (player) {
    return (
      <div
        className={twMerge(
          'flex flex-col items-center p-3 rounded-xl border-2 min-w-[100px]',
          isCurrentUser ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20 bg-white/5',
          player.isReady && 'ring-2 ring-green-400'
        )}
      >
        <div className="text-sm font-bold text-white truncate max-w-[90px]">
          {player.displayName}
        </div>
        <div className="text-xs text-white/50 mt-1">Spot {spotIndex + 1}</div>
        {player.isReady && (
          <span className="text-[10px] text-green-400 font-bold mt-1">READY</span>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onJoin(spotIndex)}
      disabled={!canJoin}
      className={twMerge(
        'flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed min-w-[100px] min-h-[70px] transition-all',
        canJoin
          ? 'border-white/30 hover:border-yellow-400 hover:bg-yellow-400/10 cursor-pointer'
          : 'border-white/10 cursor-default'
      )}
    >
      <span className="text-xs text-white/30">Spot {spotIndex + 1}</span>
      {canJoin && <span className="text-[10px] text-white/40 mt-1">Click to sit</span>}
    </button>
  )
}
