import type { Card, Rank, Suit, TwentyOnePlusThreeResult, PerfectPairsResult } from './types'

function cardValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (['K', 'Q', 'J'].includes(rank)) return 10
  return parseInt(rank, 10)
}

export function calculateHandValue(cards: Card[]): number {
  let value = 0
  let aces = 0

  for (const card of cards) {
    if (!card.faceUp) continue
    value += cardValue(card.rank)
    if (card.rank === 'A') aces++
  }

  // Convert aces from 11 to 1 as needed to avoid bust
  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value
}

export function calculateFullHandValue(cards: Card[]): number {
  // Calculate value including face-down cards (for dealer logic)
  let value = 0
  let aces = 0

  for (const card of cards) {
    value += cardValue(card.rank)
    if (card.rank === 'A') aces++
  }

  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value
}

export function isSoft17(cards: Card[]): boolean {
  // Check if hand is a soft 17 (contains ace counted as 11)
  let value = 0
  let aces = 0

  for (const card of cards) {
    value += cardValue(card.rank)
    if (card.rank === 'A') aces++
  }

  // Reduce aces until we're at or below 21
  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value === 17 && aces > 0
}

export function isBust(cards: Card[]): boolean {
  return calculateHandValue(cards) > 21
}

export function getHandDisplayValue(cards: Card[]): string {
  // Returns display string for hand value, showing both values for soft hands
  // e.g., "8 / 18" for Ace + 7
  let value = 0
  let aces = 0

  for (const card of cards) {
    if (!card.faceUp) continue
    value += cardValue(card.rank)
    if (card.rank === 'A') aces++
  }

  // If no cards visible, return empty
  if (value === 0 && aces === 0) return ''

  // Check for blackjack (2 cards, all face up, totaling 21)
  if (cards.length === 2 && cards.every(c => c.faceUp) && value === 21) {
    return 'BJ'
  }

  // Calculate how many aces need to be reduced to avoid bust
  let reducedAces = 0
  let adjustedValue = value
  while (adjustedValue > 21 && reducedAces < aces) {
    adjustedValue -= 10
    reducedAces++
  }

  // If we still have an ace counted as 11 (not reduced) and value <= 21,
  // it's a soft hand - show both values
  const acesAsEleven = aces - reducedAces
  if (acesAsEleven > 0 && adjustedValue <= 21) {
    const lowValue = adjustedValue - 10 // Value if we count the ace as 1
    // Only show both if the low value is different and makes sense
    if (lowValue > 0 && lowValue !== adjustedValue) {
      return `${lowValue} / ${adjustedValue}`
    }
  }

  return String(adjustedValue)
}

export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const value = calculateFullHandValue(cards)
  return value === 21
}

export function isTripleSeven(cards: Card[]): boolean {
  if (cards.length < 3) return false
  const sevens = cards.filter(c => c.rank === '7')
  return sevens.length >= 3
}

export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  return cardValue(cards[0].rank) === cardValue(cards[1].rank)
}

export function canDoubleDown(cards: Card[]): boolean {
  return cards.length === 2
}

export function canSurrender(cards: Card[], hasActed: boolean): boolean {
  return cards.length === 2 && !hasActed
}

// ==================== Side Bet Evaluation ====================

// Get the color of a suit (for Perfect Pairs)
function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'
}

// Get numeric rank value for straight detection (A=1 or 14, 2-10, J=11, Q=12, K=13)
function getRankNumericValue(rank: Rank): number {
  if (rank === 'A') return 14
  if (rank === 'K') return 13
  if (rank === 'Q') return 12
  if (rank === 'J') return 11
  return parseInt(rank, 10)
}

// Check if 3 cards form a straight (including A-2-3 and Q-K-A)
function isStraight3Cards(cards: Card[]): boolean {
  const values = cards.map((c) => getRankNumericValue(c.rank)).sort((a, b) => a - b)

  // Check normal straight (consecutive values)
  if (values[2] - values[1] === 1 && values[1] - values[0] === 1) {
    return true
  }

  // Check for A-2-3 (Ace low): values would be [2, 3, 14]
  return values[0] === 2 && values[1] === 3 && values[2] === 14;
}

// Check if all 3 cards have the same suit
function isFlush3Cards(cards: Card[]): boolean {
  return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit
}

// Check if all 3 cards have the same rank
function isThreeOfAKind3Cards(cards: Card[]): boolean {
  return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank
}

/**
 * Evaluate 21+3 side bet (player's 2 cards + dealer's up card)
 * Returns the winning hand type or null if no win
 */
export function evaluate21Plus3(
  playerCards: Card[],
  dealerUpCard: Card
): TwentyOnePlusThreeResult {
  if (playerCards.length < 2) return null

  const threeCards = [playerCards[0], playerCards[1], dealerUpCard]

  const isTriple = isThreeOfAKind3Cards(threeCards)
  const isStraightHand = isStraight3Cards(threeCards)
  const isFlushHand = isFlush3Cards(threeCards)

  // Suited Triple: same rank AND same suit (all 3 cards identical except for the impossible scenario)
  // In a real deck this is impossible, but with 6 decks it could happen
  if (isTriple && isFlushHand) {
    return 'suitedTriple'
  }

  // Straight Flush: straight AND flush
  if (isStraightHand && isFlushHand) {
    return 'straightFlush'
  }

  // Three of a Kind: same rank, different suits
  if (isTriple) {
    return 'threeOfAKind'
  }

  // Straight
  if (isStraightHand) {
    return 'straight'
  }

  // Flush
  if (isFlushHand) {
    return 'flush'
  }

  return null
}

/**
 * Evaluate Perfect Pairs side bet (player's first 2 cards only)
 * Returns the pair type or null if no pair
 */
export function evaluatePerfectPairs(playerCards: Card[]): PerfectPairsResult {
  if (playerCards.length < 2) return null

  const card1 = playerCards[0]
  const card2 = playerCards[1]

  // Must be same rank to be any kind of pair
  if (card1.rank !== card2.rank) {
    return null
  }

  // Perfect Pair: same rank AND same suit
  if (card1.suit === card2.suit) {
    return 'perfectPair'
  }

  // Check colors
  const color1 = getSuitColor(card1.suit)
  const color2 = getSuitColor(card2.suit)

  // Colored Pair: same rank, same color, different suit
  if (color1 === color2) {
    return 'coloredPair'
  }

  // Mixed Pair: same rank, different colors
  return 'mixedPair'
}
