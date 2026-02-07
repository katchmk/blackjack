import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRoom } from '../../hooks/useRoom'
import { PlayerSeat } from './PlayerSeat'

export function RoomLobby() {
  const { id: roomId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { room, loading, join, leave, toggleReady, startGame } = useRoom(roomId!)

  if (loading || !room) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center text-white/40 py-8">
        Loading room...
      </div>
    )
  }

  // If game has started, redirect to game view
  if (room.status === 'playing') {
    navigate(`/game/${roomId}`, { replace: true })
    return null
  }

  const currentPlayer = room.players.find((p) => p.userId === user?.id)
  const isHost = room.hostId === user?.id
  const allReady = room.players.length > 0 && room.players.every((p) => p.isReady)

  const handleJoinSpot = async (spotIndex: number) => {
    if (currentPlayer) return // Already in a seat
    try {
      await join(spotIndex)
    } catch (err) {
      console.error('Failed to join:', err)
    }
  }

  const handleLeave = async () => {
    await leave()
    navigate('/')
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-yellow-400">{room.name}</h2>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-slate-700 text-white/60 rounded-lg hover:bg-slate-600 hover:text-white/80 transition-colors text-sm"
        >
          Leave Room
        </button>
      </div>

      <div className="text-sm text-white/50 mb-4">
        Min bet: ${room.minBet} &middot; {room.players.length}/{room.maxPlayers} players
      </div>

      {/* Table visualization with seats */}
      <div className="bg-gradient-to-b from-emerald-700 to-emerald-800 rounded-t-[120px] border-4 border-amber-900 p-8 mb-6">
        <div className="text-center text-white/40 text-sm tracking-widest uppercase mb-6">
          Pick your seat
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {Array.from({ length: 7 }, (_, i) => {
            const player = room.players.find((p) => p.spotIndex === i) ?? null
            return (
              <PlayerSeat
                key={i}
                spotIndex={i}
                player={player}
                isCurrentUser={player?.userId === user?.id}
                canJoin={!currentPlayer}
                onJoin={handleJoinSpot}
              />
            )
          })}
        </div>
      </div>

      {/* Controls */}
      {currentPlayer && (
        <div className="flex justify-center gap-4">
          <button
            onClick={toggleReady}
            className={`px-8 py-3 font-bold rounded-lg transition-all ${
              currentPlayer.isReady
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-gradient-to-br from-green-400 to-emerald-500 text-slate-900 hover:-translate-y-0.5 hover:shadow-lg'
            }`}
          >
            {currentPlayer.isReady ? 'Not Ready' : 'Ready Up'}
          </button>

          {isHost && (
            <button
              onClick={startGame}
              disabled={!allReady}
              className="px-8 py-3 bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 font-bold rounded-lg hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-400/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
          )}
        </div>
      )}
    </div>
  )
}
