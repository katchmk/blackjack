import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMultiplayerGame } from '../../hooks/useMultiplayerGame'
import { MultiplayerTableLayout } from './MultiplayerTableLayout'

export function MultiplayerGame() {
  const { id: roomId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { gameState, bankroll, turnTimer, bettingTimer, sendAction } = useMultiplayerGame(roomId!)

  if (!gameState) {
    return (
      <div className="w-full max-w-5xl mx-auto text-center text-white/40 py-8">
        Connecting to game...
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-700 text-white/60 rounded-lg hover:bg-slate-600 hover:text-white/80 transition-colors text-sm"
        >
          Back to Lobby
        </button>
      </div>
      <MultiplayerTableLayout
        gameState={gameState}
        userId={user!.id}
        bankroll={bankroll}
        turnTimer={turnTimer}
        bettingTimer={bettingTimer}
        onAction={sendAction}
      />
    </div>
  )
}
