import { Router } from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../db/pool.js'
import { signToken } from './jwt.js'
import { authMiddleware } from './middleware.js'
import { config } from '../config.js'

const router = Router()

// Get current user info (token validation)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, display_name, bankroll FROM users WHERE id = $1',
      [req.user!.userId]
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const user = rows[0]
    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        bankroll: user.bankroll,
      },
    })
  } catch (err) {
    console.error('Get me error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/signup', async (req, res) => {
  const { username, password, displayName } = req.body

  if (!username || !password || !displayName) {
    res.status(400).json({ error: 'username, password, and displayName are required' })
    return
  }

  if (username.length < 3 || username.length > 20) {
    res.status(400).json({ error: 'Username must be 3-20 characters' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, display_name, bankroll)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name, bankroll`,
      [username.toLowerCase(), passwordHash, displayName, config.game.initialBankroll]
    )

    const user = rows[0]
    const token = signToken({ userId: user.id, username: user.username })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        bankroll: user.bankroll,
      },
    })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      res.status(409).json({ error: 'Username already taken' })
      return
    }
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' })
    return
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, display_name, bankroll FROM users WHERE username = $1',
      [username.toLowerCase()]
    )

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signToken({ userId: user.id, username: user.username })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        bankroll: user.bankroll,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export const authRoutes = router
