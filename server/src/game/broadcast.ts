import { sseManager } from '../sse/manager.js'
import type { BroadcastGameState, BroadcastCard, BroadcastHand } from './types.js'
import type { MultiplayerSpot, MultiplayerGameContext } from './types.js'

function sanitizeCard(card: { suit: string; rank: string; faceUp: boolean }): BroadcastCard {
  if (card.faceUp) {
    return { suit: card.suit, rank: card.rank, faceUp: true }
  }
  return { faceUp: false }
}

function sanitizeHand(hand: {
  cards: Array<{ suit: string; rank: string; faceUp: boolean }>
  bet: number
  isDoubled: boolean
  isSplit: boolean
  result?: string
}): BroadcastHand {
  return {
    cards: hand.cards.map(sanitizeCard),
    bet: hand.bet,
    isDoubled: hand.isDoubled,
    isSplit: hand.isSplit,
    result: hand.result,
  }
}

interface GameSnapshot {
  value: string | Record<string, unknown>
  context: MultiplayerGameContext
}

export function sanitizeGameState(snapshot: GameSnapshot): BroadcastGameState {
  const ctx = snapshot.context
  const phase = typeof snapshot.value === 'string' ? snapshot.value : JSON.stringify(snapshot.value)

  return {
    phase,
    spots: ctx.spots.map((spot: MultiplayerSpot) => ({
      id: spot.id,
      playerId: spot.playerId,
      playerName: spot.playerName,
      bet: spot.bet,
      hands: spot.hands.map(sanitizeHand),
      activeHandIndex: spot.activeHandIndex,
      sideBetResults: spot.sideBetResults,
    })),
    activeSpotIndex: ctx.activeSpotIndex,
    dealerHand: ctx.dealerHand.map(
      (c: { suit: string; rank: string; faceUp: boolean }) => sanitizeCard(c)
    ),
    message: ctx.message,
    shoeSize: ctx.shoe.length,
    roundNumber: ctx.roundNumber,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastGameState(roomId: string, snapshot: any) {
  const state = sanitizeGameState(snapshot)
  sseManager.broadcastToRoom(roomId, 'game_state', state)

  // Send personal bankroll data to each player
  for (const spot of snapshot.context.spots) {
    if (spot.playerId) {
      sseManager.sendToPlayer(roomId, spot.playerId, 'personal', {
        bankroll: spot.playerBankroll,
        spotIndex: spot.id,
      })
    }
  }
}
