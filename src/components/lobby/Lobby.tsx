import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLobby } from '../../hooks/useLobby'
import { RoomCard } from './RoomCard'
import { CreateRoomDialog } from './CreateRoomDialog'

export function Lobby() {
  const { user, logout } = useAuth()
  const { rooms, loading, createRoom } = useLobby()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const handleJoin = (roomId: string) => {
    navigate(`/room/${roomId}`)
  }

  const handleCreate = async (name: string, minBet: number) => {
    const room = await createRoom(name, minBet)
    navigate(`/room/${room.id}`)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-white/60 text-sm">
          Welcome, <span className="text-yellow-400 font-bold">{user?.displayName}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/practice')}
            className="px-4 py-2 bg-slate-700 text-white/80 rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            Practice Mode
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-700 text-white/60 rounded-lg hover:bg-slate-600 hover:text-white/80 transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Create room button */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full mb-4 px-6 py-4 bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 font-bold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-400/40 transition-all text-lg"
      >
        + Create Room
      </button>

      {/* Room list */}
      {loading ? (
        <div className="text-center text-white/40 py-8">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center text-white/40 py-8">
          No rooms yet. Create one to get started!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoin} />
          ))}
        </div>
      )}

      <CreateRoomDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
