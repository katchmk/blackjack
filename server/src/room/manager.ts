import { pool } from '../db/pool.js'
import { sseManager } from '../sse/manager.js'

export interface RoomInfo {
  id: string
  name: string
  hostId: string
  status: 'waiting' | 'playing' | 'finished'
  minBet: number
  maxPlayers: number
  createdAt: string
  players: RoomPlayerInfo[]
}

export interface RoomPlayerInfo {
  userId: string
  username: string
  displayName: string
  spotIndex: number
  isReady: boolean
}

export async function getRoomInfo(roomId: string): Promise<RoomInfo | null> {
  const { rows: roomRows } = await pool.query(
    `SELECT r.id, r.name, r.host_id, r.status, r.min_bet, r.max_players, r.created_at
     FROM rooms r WHERE r.id = $1`,
    [roomId]
  )

  if (roomRows.length === 0) return null

  const room = roomRows[0]
  const { rows: playerRows } = await pool.query(
    `SELECT rp.user_id, u.username, u.display_name, rp.spot_index, rp.is_ready
     FROM room_players rp
     JOIN users u ON u.id = rp.user_id
     WHERE rp.room_id = $1
     ORDER BY rp.spot_index`,
    [roomId]
  )

  return {
    id: room.id,
    name: room.name,
    hostId: room.host_id,
    status: room.status,
    minBet: room.min_bet,
    maxPlayers: room.max_players,
    createdAt: room.created_at,
    players: playerRows.map((p: Record<string, unknown>) => ({
      userId: p.user_id as string,
      username: p.username as string,
      displayName: p.display_name as string,
      spotIndex: p.spot_index as number,
      isReady: p.is_ready as boolean,
    })),
  }
}

export async function broadcastRoomUpdate(roomId: string) {
  const info = await getRoomInfo(roomId)
  if (info) {
    sseManager.broadcastToRoom(roomId, 'room_update', info)
  }
}

export async function broadcastLobbyUpdate() {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.host_id, r.status, r.min_bet, r.max_players, r.created_at,
            COUNT(rp.user_id)::int as player_count
     FROM rooms r
     LEFT JOIN room_players rp ON rp.room_id = r.id
     WHERE r.status IN ('waiting', 'playing')
     GROUP BY r.id
     ORDER BY r.created_at DESC`
  )

  const rooms = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    hostId: r.host_id,
    status: r.status,
    minBet: r.min_bet,
    maxPlayers: r.max_players,
    playerCount: r.player_count,
    createdAt: r.created_at,
  }))

  sseManager.broadcastToLobby('rooms_update', rooms)
}
