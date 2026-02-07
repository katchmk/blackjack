import { useState, useEffect, useCallback } from 'react'
import { api, connectSSE } from '../lib/api'

export interface BroadcastCard {
  suit?: string
  rank?: string
  faceUp: boolean
}

export interface BroadcastHand {
  cards: BroadcastCard[]
  bet: number
  isDoubled: boolean
  isSplit: boolean
  result?: string
}

export interface BroadcastSpot {
  id: number
  playerId: string | null
  playerName: string | null
  bet: number
  hands: BroadcastHand[]
  activeHandIndex: number
  sideBetResults: {
    twentyOnePlusThree: string | null
    perfectPairs: string | null
  }
}

export interface BroadcastGameState {
  phase: string
  spots: BroadcastSpot[]
  activeSpotIndex: number
  dealerHand: BroadcastCard[]
  message: string
  shoeSize: number
  roundNumber: number
}

export function useMultiplayerGame(roomId: string) {
  const [gameState, setGameState] = useState<BroadcastGameState | null>(null)
  const [bankroll, setBankroll] = useState(0)
  const [turnTimer, setTurnTimer] = useState<number | null>(null)
  const [bettingTimer, setBettingTimer] = useState<number | null>(null)

  useEffect(() => {
    const sse = connectSSE(`/rooms/${roomId}/stream`, {
      game_state: (data) => setGameState(data as BroadcastGameState),
      personal: (data) => {
        const d = data as { bankroll: number }
        setBankroll(d.bankroll)
      },
      turn_timer: (data) => {
        const d = data as { secondsLeft: number }
        setTurnTimer(d.secondsLeft)
      },
      betting_timer: (data) => {
        const d = data as { secondsLeft: number }
        setBettingTimer(d.secondsLeft)
      },
    })

    return () => sse.close()
  }, [roomId])

  const sendAction = useCallback(
    async (type: string, amount?: number) => {
      await api.post('/game/action', {
        roomId,
        action: { type, amount },
      })
    },
    [roomId]
  )

  return { gameState, bankroll, turnTimer, bettingTimer, sendAction }
}
