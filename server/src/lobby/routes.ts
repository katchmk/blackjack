import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authMiddleware } from '../auth/middleware.js'
import { sseManager, type SSEClient } from '../sse/manager.js'
import { broadcastLobbyUpdate } from '../room/manager.js'

const router = Router()

// List rooms
router.get('/rooms', authMiddleware, async (_req, res) => {
  try {
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

    res.json(rooms)
  } catch (err) {
    console.error('List rooms error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create room
router.post('/rooms', authMiddleware, async (req, res) => {
  const { name, minBet = 5, maxPlayers = 7 } = req.body
  const userId = req.user!.userId

  if (!name || name.length < 1 || name.length > 30) {
    res.status(400).json({ error: 'Room name must be 1-30 characters' })
    return
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO rooms (name, host_id, min_bet, max_players)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, host_id, status, min_bet, max_players, created_at`,
      [name, userId, minBet, Math.min(maxPlayers, 7)]
    )

    const room = rows[0]
    res.status(201).json({
      id: room.id,
      name: room.name,
      hostId: room.host_id,
      status: room.status,
      minBet: room.min_bet,
      maxPlayers: room.max_players,
      createdAt: room.created_at,
    })

    // Notify lobby clients
    broadcastLobbyUpdate()
  } catch (err) {
    console.error('Create room error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// SSE: Lobby stream
router.get('/lobby/stream', authMiddleware, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // Send initial keepalive
  res.write(':connected\n\n')

  const keepalive = setInterval(() => res.write(':keepalive\n\n'), 30000)

  const client: SSEClient = {
    res,
    userId: req.user!.userId,
    username: req.user!.username,
  }

  sseManager.addLobbyClient(client)

  req.on('close', () => {
    clearInterval(keepalive)
    sseManager.removeLobbyClient(client)
  })
})

export const lobbyRoutes = router
