import { useState, useEffect, useCallback } from 'react'
import { api, connectSSE } from '../lib/api'

export interface RoomPlayer {
  userId: string
  username: string
  displayName: string
  spotIndex: number
  isReady: boolean
}

export interface RoomInfo {
  id: string
  name: string
  hostId: string
  status: 'waiting' | 'playing' | 'finished'
  minBet: number
  maxPlayers: number
  players: RoomPlayer[]
}

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sse = connectSSE(`/rooms/${roomId}/stream`, {
      room_update: (data) => {
        setRoom(data as RoomInfo)
        setLoading(false)
      },
    })

    return () => {
      sse.close()
      setRoom(null)
      setLoading(true)
    }
  }, [roomId])

  const join = useCallback(
    async (spotIndex: number) => {
      await api.post(`/rooms/${roomId}/join`, { spotIndex })
    },
    [roomId]
  )

  const leave = useCallback(async () => {
    await api.post(`/rooms/${roomId}/leave`)
  }, [roomId])

  const toggleReady = useCallback(async () => {
    await api.post(`/rooms/${roomId}/ready`)
  }, [roomId])

  const startGame = useCallback(async () => {
    await api.post(`/rooms/${roomId}/start`)
  }, [roomId])

  return { room, loading, join, leave, toggleReady, startGame }
}
