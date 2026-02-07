import { Router } from 'express'
import { authMiddleware } from '../auth/middleware.js'
import { gameEngine } from './engine.js'

const router = Router()

router.post('/game/action', authMiddleware, (req, res) => {
  const userId = req.user!.userId
  const { roomId, action } = req.body

  if (!roomId || !action || !action.type) {
    res.status(400).json({ error: 'roomId and action.type are required' })
    return
  }

  const result = gameEngine.handleAction(roomId, userId, action)

  if (result.ok) {
    res.json({ ok: true })
  } else {
    res.status(400).json({ error: result.error })
  }
})

export const gameRoutes = router
