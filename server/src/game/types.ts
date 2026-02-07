// Multiplayer-specific types that extend the shared types
import type { Card, Hand, SideBetResults } from '../../../src/game/types.js'

export interface MultiplayerSpot {
  id: number
  playerId: string | null
  playerName: string | null
  playerBankroll: number
  bet: number
  hands: Hand[]
  activeHandIndex: number
  sideBetResults: SideBetResults
}

export interface MultiplayerGameContext {
  shoe: Card[]
  spots: MultiplayerSpot[]
  activeSpotIndex: number
  dealerHand: Card[]
  message: string
  roundNumber: number
}

// What gets broadcast to all clients (no shoe, hidden cards masked)
export interface BroadcastGameState {
  phase: string
  spots: BroadcastSpot[]
  activeSpotIndex: number
  dealerHand: BroadcastCard[]
  message: string
  shoeSize: number
  roundNumber: number
}

export interface BroadcastSpot {
  id: number
  playerId: string | null
  playerName: string | null
  bet: number
  hands: BroadcastHand[]
  activeHandIndex: number
  sideBetResults: SideBetResults
}

export interface BroadcastHand {
  cards: BroadcastCard[]
  bet: number
  isDoubled: boolean
  isSplit: boolean
  result?: string
}

export interface BroadcastCard {
  suit?: string
  rank?: string
  faceUp: boolean
}

// Game action sent from client
export interface GameAction {
  type: 'PLACE_BET' | 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT' | 'SURRENDER' | 'TAKE_INSURANCE' | 'DECLINE_INSURANCE' | 'TAKE_EVEN_MONEY' | 'DECLINE_EVEN_MONEY'
  roomId: string
  amount?: number
}
