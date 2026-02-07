export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'blackjack-dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME ?? 'blackjack',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  game: {
    bettingTimerSeconds: 30,
    turnTimerSeconds: 20,
    disconnectGraceSeconds: 10,
    disconnectRemoveSeconds: 60,
    initialBankroll: 2500,
  },
} as const
