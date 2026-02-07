import type { LobbyRoom } from '../../hooks/useLobby'

interface RoomCardProps {
  room: LobbyRoom
  onJoin: (roomId: string) => void
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const isFull = room.playerCount >= room.maxPlayers
  const isPlaying = room.status === 'playing'

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-500 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white truncate">{room.name}</h3>
        <div className="flex gap-4 text-sm text-white/60 mt-1">
          <span>
            {room.playerCount}/{room.maxPlayers} players
          </span>
          <span>Min ${room.minBet}</span>
          <span
            className={
              isPlaying ? 'text-yellow-400' : 'text-green-400'
            }
          >
            {isPlaying ? 'In Progress' : 'Waiting'}
          </span>
        </div>
      </div>
      <button
        onClick={() => onJoin(room.id)}
        disabled={isFull || isPlaying}
        className="px-5 py-2 bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold rounded-lg hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        Join
      </button>
    </div>
  )
}
