import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authMiddleware } from '../auth/middleware.js'
import { sseManager, type SSEClient } from '../sse/manager.js'
import { getRoomInfo, broadcastRoomUpdate, broadcastLobbyUpdate } from './manager.js'
import { gameEngine } from '../game/engine.js'

const router = Router()

// Join room
router.post('/rooms/:id/join', authMiddleware, async (req, res) => {
  const roomId = req.params.id as string
  const userId = req.user!.userId
  const { spotIndex } = req.body

  if (spotIndex === undefined || spotIndex < 0 || spotIndex > 6) {
    res.status(400).json({ error: 'spotIndex must be 0-6' })
    return
  }

  try {
    // Check room exists and is waiting
    const { rows: roomRows } = await pool.query(
      'SELECT id, status, max_players FROM rooms WHERE id = $1',
      [roomId]
    )

    if (roomRows.length === 0) {
      res.status(404).json({ error: 'Room not found' })
      return
    }

    if (roomRows[0].status !== 'waiting') {
      res.status(400).json({ error: 'Room is not accepting players' })
      return
    }

    // Check player count
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM room_players WHERE room_id = $1',
      [roomId]
    )

    if (countRows[0].count >= roomRows[0].max_players) {
      res.status(400).json({ error: 'Room is full' })
      return
    }

    // Check if user is already in this room
    const { rows: existingRows } = await pool.query(
      'SELECT spot_index FROM room_players WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    )

    if (existingRows.length > 0) {
      res.status(400).json({ error: 'Already in this room' })
      return
    }

    // Insert
    await pool.query(
      'INSERT INTO room_players (room_id, user_id, spot_index) VALUES ($1, $2, $3)',
      [roomId, userId, spotIndex]
    )

    res.json({ ok: true })

    broadcastRoomUpdate(roomId)
    broadcastLobbyUpdate()
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      res.status(409).json({ error: 'Spot already taken' })
      return
    }
    console.error('Join room error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Leave room
router.post('/rooms/:id/leave', authMiddleware, async (req, res) => {
  const roomId = req.params.id as string
  const userId = req.user!.userId

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM room_players WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    )

    if (rowCount === 0) {
      res.status(404).json({ error: 'Not in this room' })
      return
    }

    // Check if room is now empty, if so delete it
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM room_players WHERE room_id = $1',
      [roomId]
    )

    if (countRows[0].count === 0) {
      await pool.query("UPDATE rooms SET status = 'finished' WHERE id = $1", [roomId])
    } else {
      // If the leaving player was host, assign new host
      const { rows: roomRows } = await pool.query(
        'SELECT host_id FROM rooms WHERE id = $1',
        [roomId]
      )
      if (roomRows[0].host_id === userId) {
        const { rows: newHostRows } = await pool.query(
          'SELECT user_id FROM room_players WHERE room_id = $1 ORDER BY joined_at LIMIT 1',
          [roomId]
        )
        if (newHostRows.length > 0) {
          await pool.query('UPDATE rooms SET host_id = $1 WHERE id = $2', [
            newHostRows[0].user_id,
            roomId,
          ])
        }
      }
    }

    res.json({ ok: true })

    broadcastRoomUpdate(roomId)
    broadcastLobbyUpdate()
  } catch (err) {
    console.error('Leave room error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Toggle ready
router.post('/rooms/:id/ready', authMiddleware, async (req, res) => {
  const roomId = req.params.id as string
  const userId = req.user!.userId

  try {
    const { rowCount } = await pool.query(
      `UPDATE room_players SET is_ready = NOT is_ready
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    )

    if (rowCount === 0) {
      res.status(404).json({ error: 'Not in this room' })
      return
    }

    res.json({ ok: true })

    broadcastRoomUpdate(roomId)
  } catch (err) {
    console.error('Ready toggle error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start game (host only)
router.post('/rooms/:id/start', authMiddleware, async (req, res) => {
  const roomId = req.params.id as string
  const userId = req.user!.userId

  try {
    // Verify host
    const { rows: roomRows } = await pool.query(
      'SELECT host_id, status FROM rooms WHERE id = $1',
      [roomId]
    )

    if (roomRows.length === 0) {
      res.status(404).json({ error: 'Room not found' })
      return
    }

    if (roomRows[0].host_id !== userId) {
      res.status(403).json({ error: 'Only the host can start the game' })
      return
    }

    if (roomRows[0].status !== 'waiting') {
      res.status(400).json({ error: 'Game already started' })
      return
    }

    // Check all players are ready
    const roomInfo = await getRoomInfo(roomId)
    if (!roomInfo || roomInfo.players.length < 1) {
      res.status(400).json({ error: 'Need at least 1 player' })
      return
    }

    const allReady = roomInfo.players.every((p) => p.isReady)
    if (!allReady) {
      res.status(400).json({ error: 'Not all players are ready' })
      return
    }

    // Update room status
    await pool.query("UPDATE rooms SET status = 'playing' WHERE id = $1", [roomId])

    // Start the game engine
    await gameEngine.createGame(roomId, roomInfo.players)

    res.json({ ok: true })

    broadcastRoomUpdate(roomId)
    broadcastLobbyUpdate()
  } catch (err) {
    console.error('Start game error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// SSE: Room stream
router.get('/rooms/:id/stream', authMiddleware, (req, res) => {
  const roomId = req.params.id as string

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  res.write(':connected\n\n')

  const keepalive = setInterval(() => res.write(':keepalive\n\n'), 30000)

  const client: SSEClient = {
    res,
    userId: req.user!.userId,
    username: req.user!.username,
  }

  sseManager.addRoomClient(roomId, client)

  // Send current room state immediately
  getRoomInfo(roomId).then((info) => {
    if (info) {
      res.write(`event: room_update\ndata: ${JSON.stringify(info)}\n\n`)
    }

    // If game is active, send current game state
    const gameState = gameEngine.getGameState(roomId)
    if (gameState) {
      res.write(`event: game_state\ndata: ${JSON.stringify(gameState)}\n\n`)
    }
  })

  req.on('close', () => {
    clearInterval(keepalive)
    sseManager.removeRoomClient(roomId, client)

    // Handle disconnection in game engine
    gameEngine.handleDisconnect(roomId, req.user!.userId)
  })
})

export const roomRoutes = router
