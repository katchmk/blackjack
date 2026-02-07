import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { authRoutes } from './auth/routes.js'
import { lobbyRoutes } from './lobby/routes.js'
import { roomRoutes } from './room/routes.js'
import { gameRoutes } from './game/routes.js'

const app = express()

// Middleware
app.use(cors({ origin: config.cors.origin, credentials: true }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api', lobbyRoutes)
app.use('/api', roomRoutes)
app.use('/api', gameRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(config.port, () => {
  console.log(`Blackjack server running on port ${config.port}`)
})
