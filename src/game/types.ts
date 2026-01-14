export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface Hand {
  cards: Card[]
  bet: number
  isDoubled: boolean
  isSplit: boolean
  isSplitAces: boolean
  isSettled: boolean
  tripleSevensAwarded?: boolean
  result?: 'win' | 'lose' | 'push' | 'blackjack' | 'surrender'
}

// Side bet types
export type TwentyOnePlusThreeResult =
  | 'suitedTriple'    // 100:1 - same rank, same suit
  | 'straightFlush'   // 40:1
  | 'threeOfAKind'    // 30:1 - same rank, different suits
  | 'straight'        // 10:1
  | 'flush'           // 5:1
  | null              // no win

export type PerfectPairsResult =
  | 'perfectPair'     // 25:1 - same rank, same suit
  | 'coloredPair'     // 12:1 - same rank, same color, different suit
  | 'mixedPair'       // 6:1 - same rank, different colors
  | null              // no pair

export interface SideBets {
  twentyOnePlusThree: number
  perfectPairs: number
}

export interface SideBetResults {
  twentyOnePlusThree: TwentyOnePlusThreeResult
  perfectPairs: PerfectPairsResult
}

// Side bet payout multipliers (includes original bet return)
export const SIDE_BET_PAYOUTS = {
  twentyOnePlusThree: {
    suitedTriple: 101,    // 100:1 + original
    straightFlush: 41,    // 40:1 + original
    threeOfAKind: 31,     // 30:1 + original
    straight: 11,         // 10:1 + original
    flush: 6,             // 5:1 + original
  },
  perfectPairs: {
    perfectPair: 26,      // 25:1 + original
    coloredPair: 13,      // 12:1 + original
    mixedPair: 7,         // 6:1 + original
  },
} as const

// 7-spot table configuration
export const SPOT_COUNT = 7

// Represents a single betting spot on the table
export interface Spot {
  id: number                    // 0-6
  bet: number                   // Main bet for this spot
  sideBets: SideBets           // Side bets for this spot
  sideBetResults: SideBetResults
  hands: Hand[]                 // Can have multiple from splits
  activeHandIndex: number       // Which hand in this spot is active
}

// Stores bet amounts for rebet functionality
export interface PreviousBets {
  spots: Array<{
    bet: number
    sideBets: SideBets
  }>
}

export interface GameContext {
  shoe: Card[]
  spots: Spot[]                 // 7 betting spots
  activeSpotIndex: number       // Which spot is being played (during playerTurn)
  bettingSpotIndex: number      // Which spot user is placing bets on (during betting)
  dealerHand: Card[]
  bankroll: number
  insuranceBet: number          // Global - insurance on dealer showing ace
  message: string
  previousBets: PreviousBets | null  // Store last round's bets for rebet
  lastWin: number               // Net profit/loss from the last completed round
  lastWinAmount: number         // Total winnings from winning bets (including original stake)
}

export const CHIP_VALUES = [5, 25, 100, 500, 1000] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

export const INITIAL_BANKROLL = 2500
export const MIN_BET = 5
export const DECK_COUNT = 6
export const RESHUFFLE_THRESHOLD = 0.25 // Reshuffle when 25% cards remain
