import type { Card, Suit, Rank } from './types'
import { DECK_COUNT, RESHUFFLE_THRESHOLD } from './types'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: true })
    }
  }
  return deck
}

export function createShoe(): Card[] {
  const shoe: Card[] = []
  for (let i = 0; i < DECK_COUNT; i++) {
    shoe.push(...createDeck())
  }
  return shuffle(shoe)
}

export function shuffle(cards: Card[]): Card[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCard(shoe: Card[], faceUp = true): { card: Card; shoe: Card[] } {
  if (shoe.length === 0) {
    throw new Error('Shoe is empty')
  }
  const [card, ...remainingShoe] = shoe
  return {
    card: { ...card, faceUp },
    shoe: remainingShoe,
  }
}

export function shouldReshuffle(shoe: Card[]): boolean {
  const totalCards = DECK_COUNT * 52
  return shoe.length < totalCards * RESHUFFLE_THRESHOLD
}
