import { createActor, type AnyActorRef } from 'xstate'
import { createMultiplayerMachine } from './machine.js'
import { broadcastGameState, sanitizeGameState } from './broadcast.js'
import { startBettingTimer, startTurnTimer, clearTimer } from './timers.js'
import { pool } from '../db/pool.js'
import { sseManager } from '../sse/manager.js'
import { config } from '../config.js'
import type { RoomPlayerInfo } from '../room/manager.js'
import type { BroadcastGameState } from './types.js'

interface GameInstance {
  actor: AnyActorRef
  roomId: string
  players: Map<string, { spotIndex: number; bankroll: number }>
  betsReceived: Set<string>
  insuranceResponses: Set<string>
  evenMoneyResponses: Set<string>
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>
}

class GameEngine {
  private games = new Map<string, GameInstance>()

  async createGame(roomId: string, players: RoomPlayerInfo[]) {
    // Load bankrolls from DB
    const playerData = await Promise.all(
      players.map(async (p) => {
        try {
          const { rows } = await pool.query('SELECT bankroll FROM users WHERE id = $1', [p.userId])
          return {
            playerId: p.userId,
            playerName: p.displayName,
            spotIndex: p.spotIndex,
            bankroll: rows[0]?.bankroll ?? config.game.initialBankroll,
          }
        } catch {
          return {
            playerId: p.userId,
            playerName: p.displayName,
            spotIndex: p.spotIndex,
            bankroll: config.game.initialBankroll,
          }
        }
      })
    )

    const machine = createMultiplayerMachine(playerData)
    const actor = createActor(machine)

    const instance: GameInstance = {
      actor,
      roomId,
      players: new Map(
        playerData.map((p) => [p.playerId, { spotIndex: p.spotIndex, bankroll: p.bankroll }])
      ),
      betsReceived: new Set(),
      insuranceResponses: new Set(),
      evenMoneyResponses: new Set(),
      disconnectTimers: new Map(),
    }

    this.games.set(roomId, instance)

    // Subscribe to state changes to broadcast
    actor.subscribe((snapshot) => {
      broadcastGameState(roomId, snapshot)

      const phase = typeof snapshot.value === 'string' ? snapshot.value : ''

      // Manage timers based on phase
      if (phase === 'betting') {
        instance.betsReceived.clear()
        startBettingTimer(roomId, () => {
          this.handleBettingTimeout(roomId)
        })
      } else if (phase === 'playerTurn') {
        startTurnTimer(roomId, () => {
          actor.send({ type: 'PLAYER_TIMEOUT' })
        })
      } else if (phase === 'settlement') {
        clearTimer(roomId)
        // Persist bankrolls after settlement
        this.persistBankrolls(roomId)
        // Auto-start new round after 5 seconds
        setTimeout(() => {
          const game = this.games.get(roomId)
          if (game) {
            game.actor.send({ type: 'NEW_ROUND' })
          }
        }, 5000)
      } else if (phase === 'insurance' || phase === 'evenMoney') {
        // 15-second timer for insurance/even money decisions
        clearTimer(roomId)
        startTurnTimer(roomId, () => {
          if (phase === 'insurance') {
            actor.send({ type: 'ALL_INSURANCE_IN' })
          } else {
            actor.send({ type: 'ALL_EVEN_MONEY_IN' })
          }
        })
      } else {
        // Clear timer for transient states
        if (phase !== 'dealerTurn') {
          clearTimer(roomId)
        }
      }
    })

    actor.start()
  }

  handleAction(
    roomId: string,
    playerId: string,
    action: { type: string; amount?: number }
  ): { ok: boolean; error?: string } {
    const game = this.games.get(roomId)
    if (!game) return { ok: false, error: 'Game not found' }

    if (!game.players.has(playerId)) return { ok: false, error: 'Not a player in this game' }

    const snapshot = game.actor.getSnapshot()
    const phase = typeof snapshot.value === 'string' ? snapshot.value : ''

    switch (action.type) {
      case 'PLACE_BET': {
        if (phase !== 'betting') return { ok: false, error: 'Not in betting phase' }
        if (!action.amount || action.amount < 5) return { ok: false, error: 'Invalid bet amount' }

        game.actor.send({
          type: 'PLACE_BET',
          playerId,
          amount: action.amount,
        })

        game.betsReceived.add(playerId)

        // Check if all players have bet
        if (game.betsReceived.size >= game.players.size) {
          clearTimer(roomId)
          game.actor.send({ type: 'ALL_BETS_IN' })
        }

        return { ok: true }
      }

      case 'HIT':
      case 'STAND':
      case 'DOUBLE':
      case 'SPLIT':
      case 'SURRENDER': {
        if (phase !== 'playerTurn') return { ok: false, error: 'Not in player turn phase' }

        game.actor.send({ type: action.type, playerId })
        return { ok: true }
      }

      case 'TAKE_INSURANCE':
      case 'DECLINE_INSURANCE': {
        if (phase !== 'insurance') return { ok: false, error: 'Not in insurance phase' }

        game.insuranceResponses.add(playerId)

        if (action.type === 'TAKE_INSURANCE') {
          game.actor.send({ type: 'TAKE_INSURANCE', playerId })
        }

        // Check if all players responded
        if (game.insuranceResponses.size >= game.players.size) {
          clearTimer(roomId)
          game.actor.send({ type: 'ALL_INSURANCE_IN' })
          game.insuranceResponses.clear()
        }

        return { ok: true }
      }

      case 'TAKE_EVEN_MONEY':
      case 'DECLINE_EVEN_MONEY': {
        if (phase !== 'evenMoney') return { ok: false, error: 'Not in even money phase' }

        game.evenMoneyResponses.add(playerId)

        if (action.type === 'TAKE_EVEN_MONEY') {
          game.actor.send({ type: 'TAKE_EVEN_MONEY', playerId })
        }

        if (game.evenMoneyResponses.size >= game.players.size) {
          clearTimer(roomId)
          game.actor.send({ type: 'ALL_EVEN_MONEY_IN' })
          game.evenMoneyResponses.clear()
        }

        return { ok: true }
      }

      default:
        return { ok: false, error: 'Unknown action type' }
    }
  }

  getGameState(roomId: string): BroadcastGameState | null {
    const game = this.games.get(roomId)
    if (!game) return null

    const snapshot = game.actor.getSnapshot()
    return sanitizeGameState(snapshot)
  }

  handleDisconnect(roomId: string, userId: string) {
    const game = this.games.get(roomId)
    if (!game) return

    if (!game.players.has(userId)) return

    sseManager.broadcastToRoom(roomId, 'player_disconnected', { playerId: userId })

    // Grace period — auto-stand if it's their turn
    const disconnectTimer = setTimeout(() => {
      const currentGame = this.games.get(roomId)
      if (!currentGame) return

      const snapshot = currentGame.actor.getSnapshot()
      const phase = typeof snapshot.value === 'string' ? snapshot.value : ''

      if (phase === 'playerTurn') {
        const activeSpot = snapshot.context.spots[snapshot.context.activeSpotIndex]
        if (activeSpot?.playerId === userId) {
          currentGame.actor.send({ type: 'PLAYER_TIMEOUT' })
        }
      }
    }, config.game.disconnectGraceSeconds * 1000)

    game.disconnectTimers.set(userId, disconnectTimer)
  }

  handleReconnect(roomId: string, userId: string) {
    const game = this.games.get(roomId)
    if (!game) return

    const timer = game.disconnectTimers.get(userId)
    if (timer) {
      clearTimeout(timer)
      game.disconnectTimers.delete(userId)
    }

    sseManager.broadcastToRoom(roomId, 'player_reconnected', { playerId: userId })
  }

  private handleBettingTimeout(roomId: string) {
    const game = this.games.get(roomId)
    if (!game) return

    // Only proceed if at least one bet was placed
    const snapshot = game.actor.getSnapshot()
    const hasAnyBet = snapshot.context.spots.some(
      (s: { bet: number }) => s.bet > 0
    )

    if (hasAnyBet) {
      game.actor.send({ type: 'ALL_BETS_IN' })
    } else {
      // Restart betting timer if no bets placed
      startBettingTimer(roomId, () => {
        this.handleBettingTimeout(roomId)
      })
    }
  }

  private async persistBankrolls(roomId: string) {
    const game = this.games.get(roomId)
    if (!game) return

    const snapshot = game.actor.getSnapshot()
    const spots = snapshot.context.spots
    const roundNumber = snapshot.context.roundNumber

    // Persist bankrolls
    for (const spot of spots) {
      if (spot.playerId) {
        try {
          await pool.query(
            'UPDATE users SET bankroll = $1, total_hands_played = total_hands_played + 1 WHERE id = $2',
            [Math.round(spot.playerBankroll), spot.playerId]
          )
        } catch (err) {
          console.error(`Failed to persist bankroll for ${spot.playerId}:`, err)
        }
      }
    }

    // Record round history
    try {
      const result = sanitizeGameState(snapshot)
      await pool.query(
        'INSERT INTO round_history (room_id, round_number, result) VALUES ($1, $2, $3)',
        [roomId, roundNumber, JSON.stringify(result)]
      )
    } catch (err) {
      console.error(`Failed to record round history for room ${roomId}:`, err)
    }
  }

  destroyGame(roomId: string) {
    const game = this.games.get(roomId)
    if (!game) return

    clearTimer(roomId)
    game.actor.stop()

    for (const timer of game.disconnectTimers.values()) {
      clearTimeout(timer)
    }

    this.games.delete(roomId)
  }

  hasGame(roomId: string): boolean {
    return this.games.has(roomId)
  }
}

export const gameEngine = new GameEngine()
