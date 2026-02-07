import { useState, useEffect } from 'react'
import { api, connectSSE } from '../lib/api'

export interface LobbyRoom {
  id: string
  name: string
  hostId: string
  status: 'waiting' | 'playing' | 'finished'
  minBet: number
  maxPlayers: number
  playerCount: number
  createdAt: string
}

export function useLobby() {
  const [rooms, setRooms] = useState<LobbyRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial rooms
    api.get<LobbyRoom[]>('/rooms').then(
      (data) => {
        setRooms(data)
        setLoading(false)
      },
      () => setLoading(false)
    )

    // Subscribe to lobby SSE
    const sse = connectSSE('/lobby/stream', {
      rooms_update: (data) => setRooms(data as LobbyRoom[]),
    })

    return () => sse.close()
  }, [])

  const createRoom = async (name: string, minBet = 5) => {
    const room = await api.post<LobbyRoom>('/rooms', { name, minBet })
    return room
  }

  return { rooms, loading, createRoom }
}
