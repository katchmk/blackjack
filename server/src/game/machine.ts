import { setup, assign } from 'xstate'
import type { Card, Hand, SideBetResults } from '../../../src/game/types.js'
import { createShoe, dealCard, shouldReshuffle } from '../../../src/game/deck.js'
import {
  calculateHandValue,
  calculateFullHandValue,
  isBust,
  isBlackjack,
  isTripleSeven,
  canSplit,
  canDoubleDown,
} from '../../../src/game/scoring.js'
import type { MultiplayerSpot, MultiplayerGameContext } from './types.js'

// Multiplayer events include playerId for validation
type MultiplayerEvent =
  | { type: 'PLACE_BET'; playerId: string; amount: number }
  | { type: 'ALL_BETS_IN' }
  | { type: 'HIT'; playerId: string }
  | { type: 'STAND'; playerId: string }
  | { type: 'DOUBLE'; playerId: string }
  | { type: 'SPLIT'; playerId: string }
  | { type: 'SURRENDER'; playerId: string }
  | { type: 'TAKE_INSURANCE'; playerId: string }
  | { type: 'DECLINE_INSURANCE'; playerId: string }
  | { type: 'ALL_INSURANCE_IN' }
  | { type: 'TAKE_EVEN_MONEY'; playerId: string }
  | { type: 'DECLINE_EVEN_MONEY'; playerId: string }
  | { type: 'ALL_EVEN_MONEY_IN' }
  | { type: 'PLAYER_TIMEOUT' }
  | { type: 'NEW_ROUND' }

function createEmptyHand(bet: number): Hand {
  return {
    cards: [],
    bet,
    isDoubled: false,
    isSplit: false,
    isSplitAces: false,
    isSettled: false,
  }
}

function createEmptySideBetResults(): SideBetResults {
  return { twentyOnePlusThree: null, perfectPairs: null }
}

function getCurrentSpot(context: MultiplayerGameContext): MultiplayerSpot {
  return context.spots[context.activeSpotIndex]
}

function getCurrentHand(context: MultiplayerGameContext): Hand | undefined {
  const spot = getCurrentSpot(context)
  return spot.hands[spot.activeHandIndex]
}

function getActiveSpots(spots: MultiplayerSpot[]): MultiplayerSpot[] {
  return spots.filter((s) => s.bet > 0)
}

function findNextActiveSpotIndex(spots: MultiplayerSpot[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < spots.length; i++) {
    const spot = spots[i]
    if (
      spot.bet > 0 &&
      spot.hands.some((h) => !h.isSettled && !isBust(h.cards) && !isBlackjack(h.cards))
    ) {
      return i
    }
  }
  return -1
}

function allSpotsSettledFn(spots: MultiplayerSpot[]): boolean {
  return getActiveSpots(spots).every((spot) =>
    spot.hands.every((h) => h.isSettled || isBust(h.cards) || isBlackjack(h.cards))
  )
}

function spotHasMoreHands(spot: MultiplayerSpot): boolean {
  return spot.activeHandIndex < spot.hands.length - 1
}

function currentSpotSettledFn(context: MultiplayerGameContext): boolean {
  const spot = getCurrentSpot(context)
  return spot.hands.every((h) => h.isSettled || isBust(h.cards) || isBlackjack(h.cards))
}

function noActivePlayerHands(spots: MultiplayerSpot[]): boolean {
  const activeSpots = getActiveSpots(spots)
  if (activeSpots.length === 0) return false
  return activeSpots.every((spot) =>
    spot.hands.every((h) => isBust(h.cards) || h.result === 'surrender' || isBlackjack(h.cards))
  )
}

function anyPlayerHasBlackjackFn(spots: MultiplayerSpot[]): boolean {
  return getActiveSpots(spots).some((spot) =>
    spot.hands.some((h) => isBlackjack(h.cards) && !h.isSettled)
  )
}

function allActiveSpotsHaveBlackjackFn(spots: MultiplayerSpot[]): boolean {
  const activeSpots = getActiveSpots(spots)
  return (
    activeSpots.length > 0 && activeSpots.every((spot) => spot.hands.every((h) => isBlackjack(h.cards)))
  )
}

export function createMultiplayerMachine(
  players: Array<{ playerId: string; playerName: string; spotIndex: number; bankroll: number }>
) {
  const initialSpots: MultiplayerSpot[] = Array.from({ length: 7 }, (_, i) => {
    const player = players.find((p) => p.spotIndex === i)
    return {
      id: i,
      playerId: player?.playerId ?? null,
      playerName: player?.playerName ?? null,
      playerBankroll: player?.bankroll ?? 0,
      bet: 0,
      hands: [],
      activeHandIndex: 0,
      sideBetResults: createEmptySideBetResults(),
    }
  })

  return setup({
    types: {
      context: {} as MultiplayerGameContext,
      events: {} as MultiplayerEvent,
    },
    guards: {
      isActivePlayer: ({ context, event }) => {
        if (!('playerId' in event)) return false
        const activeSpot = context.spots[context.activeSpotIndex]
        return activeSpot?.playerId === event.playerId
      },
      hasAnyBet: ({ context }) => {
        return context.spots.some((s) => s.bet > 0)
      },
      dealerShowsAce: ({ context }) => {
        return context.dealerHand.length > 0 && context.dealerHand[0].rank === 'A'
      },
      dealerHasBlackjack: ({ context }) => {
        return isBlackjack(context.dealerHand)
      },
      canHit: ({ context }) => {
        const hand = getCurrentHand(context)
        return (
          hand !== undefined &&
          !hand.isSplitAces &&
          !isBust(hand.cards) &&
          calculateHandValue(hand.cards) < 21
        )
      },
      canDoubleDown: ({ context }) => {
        const spot = getCurrentSpot(context)
        const hand = getCurrentHand(context)
        return (
          hand !== undefined &&
          canDoubleDown(hand.cards) &&
          !hand.isSplitAces &&
          spot.playerBankroll >= hand.bet
        )
      },
      canSplit: ({ context }) => {
        const spot = getCurrentSpot(context)
        const hand = getCurrentHand(context)
        return (
          hand !== undefined &&
          canSplit(hand.cards) &&
          spot.hands.length < 4 &&
          spot.playerBankroll >= hand.bet
        )
      },
      canSurrender: ({ context }) => {
        const spot = getCurrentSpot(context)
        const hand = getCurrentHand(context)
        return (
          hand !== undefined &&
          hand.cards.length === 2 &&
          !hand.isSplit &&
          spot.activeHandIndex === 0
        )
      },
      hasMoreHandsInSpot: ({ context }) => {
        return spotHasMoreHands(getCurrentSpot(context))
      },
      hasMoreSpots: ({ context }) => {
        return findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1
      },
      allSpotsSettled: ({ context }) => {
        return allSpotsSettledFn(context.spots)
      },
      currentHandHas21: ({ context }) => {
        const hand = getCurrentHand(context)
        return hand !== undefined && calculateHandValue(hand.cards) === 21
      },
      currentHandIsSplitAces: ({ context }) => {
        const hand = getCurrentHand(context)
        return hand !== undefined && hand.isSplitAces
      },
      currentSpotSettled: ({ context }) => {
        return currentSpotSettledFn(context)
      },
      shouldDealerHit: ({ context }) => {
        return calculateFullHandValue(context.dealerHand) < 17
      },
      noActivePlayerHands: ({ context }) => {
        return noActivePlayerHands(context.spots)
      },
      anyPlayerHasBlackjack: ({ context }) => {
        return anyPlayerHasBlackjackFn(context.spots)
      },
      allActiveSpotsHaveBlackjack: ({ context }) => {
        return allActiveSpotsHaveBlackjackFn(context.spots)
      },
    },
    actions: {
      placeBet: assign(({ context, event }) => {
        if (event.type !== 'PLACE_BET') return {}
        const spotIndex = context.spots.findIndex((s) => s.playerId === event.playerId)
        if (spotIndex === -1) return {}

        const spots = [...context.spots]
        const spot = { ...spots[spotIndex] }

        if (spot.playerBankroll < event.amount) return {}

        spot.bet = event.amount
        spot.playerBankroll -= event.amount
        spots[spotIndex] = spot

        return { spots }
      }),
      dealInitialCards: assign(({ context }) => {
        let shoe = context.shoe
        if (shouldReshuffle(shoe)) {
          shoe = createShoe()
        }

        const spots = context.spots.map((spot) => {
          if (spot.bet === 0) return spot

          const playerCards: Card[] = []
          let result = dealCard(shoe)
          playerCards.push(result.card)
          shoe = result.shoe

          result = dealCard(shoe)
          playerCards.push(result.card)
          shoe = result.shoe

          return {
            ...spot,
            hands: [{ ...createEmptyHand(spot.bet), cards: playerCards }],
            activeHandIndex: 0,
          }
        })

        // Deal dealer cards
        const dealerCards: Card[] = []
        let result = dealCard(shoe)
        dealerCards.push(result.card)
        shoe = result.shoe

        result = dealCard(shoe, false) // Face down
        dealerCards.push(result.card)
        shoe = result.shoe

        // Evaluate side bets (none for now in multiplayer, can be added later)
        const spotsWithSideBets = spots.map((spot) => {
          if (spot.bet === 0 || spot.hands.length === 0) return spot
          return { ...spot, sideBetResults: createEmptySideBetResults() }
        })

        // Find first playable spot
        const firstPlayableSpot = spotsWithSideBets.findIndex(
          (spot) =>
            spot.bet > 0 && spot.hands.length > 0 && !isBlackjack(spot.hands[0].cards)
        )
        const firstActiveSpot =
          firstPlayableSpot !== -1
            ? firstPlayableSpot
            : spotsWithSideBets.findIndex((s) => s.bet > 0)

        return {
          shoe,
          spots: spotsWithSideBets,
          dealerHand: dealerCards,
          activeSpotIndex: firstActiveSpot >= 0 ? firstActiveSpot : 0,
          message: 'Cards dealt',
        }
      }),
      hit: assign(({ context }) => {
        const { card, shoe } = dealCard(context.shoe)
        const spots = [...context.spots]
        const spot = { ...spots[context.activeSpotIndex] }
        const hands = [...spot.hands]
        const hand = { ...hands[spot.activeHandIndex] }
        hand.cards = [...hand.cards, card]

        // Triple 7s bonus
        let newBankroll = spot.playerBankroll
        if (!hand.tripleSevensAwarded && isTripleSeven(hand.cards)) {
          hand.tripleSevensAwarded = true
          newBankroll += hand.bet
        }

        if (isBust(hand.cards)) {
          hand.isSettled = true
          hand.result = 'lose'
        }

        hands[spot.activeHandIndex] = hand
        spot.hands = hands
        spot.playerBankroll = newBankroll
        spots[context.activeSpotIndex] = spot

        return { shoe, spots, message: isBust(hand.cards) ? 'Bust!' : 'Hit' }
      }),
      stand: assign({
        message: 'Stand',
      }),
      doubleDown: assign(({ context }) => {
        const { card, shoe } = dealCard(context.shoe)
        const spots = [...context.spots]
        const spot = { ...spots[context.activeSpotIndex] }
        const hands = [...spot.hands]
        const hand = { ...hands[spot.activeHandIndex] }
        const originalBet = hand.bet

        hand.cards = [...hand.cards, card]
        hand.bet = hand.bet * 2
        hand.isDoubled = true

        let newBankroll = spot.playerBankroll - originalBet
        if (!hand.tripleSevensAwarded && isTripleSeven(hand.cards)) {
          hand.tripleSevensAwarded = true
          newBankroll += hand.bet
        }

        hands[spot.activeHandIndex] = hand
        spot.hands = hands
        spot.playerBankroll = newBankroll
        spots[context.activeSpotIndex] = spot

        return { shoe, spots, message: 'Doubled down' }
      }),
      split: assign(({ context }) => {
        const spots = [...context.spots]
        const spot = { ...spots[context.activeSpotIndex] }
        const hands = [...spot.hands]
        const hand = hands[spot.activeHandIndex]
        const [card1, card2] = hand.cards
        const splittingAces = card1.rank === 'A'

        const { card: newCard1, shoe } = dealCard(context.shoe)
        const { card: newCard2, shoe: finalShoe } = dealCard(shoe)

        const hand1: Hand = {
          cards: [card1, newCard1],
          bet: hand.bet,
          isDoubled: false,
          isSplit: true,
          isSplitAces: splittingAces,
          isSettled: false,
        }
        const hand2: Hand = {
          cards: [card2, newCard2],
          bet: hand.bet,
          isDoubled: false,
          isSplit: true,
          isSplitAces: splittingAces,
          isSettled: false,
        }

        hands.splice(spot.activeHandIndex, 1, hand1, hand2)
        spot.hands = hands
        spot.playerBankroll -= hand.bet
        spots[context.activeSpotIndex] = spot

        return { shoe: finalShoe, spots, message: 'Split' }
      }),
      surrender: assign(({ context }) => {
        const spots = [...context.spots]
        const spot = { ...spots[context.activeSpotIndex] }
        const hands = [...spot.hands]
        const hand = { ...hands[spot.activeHandIndex] }

        hand.isSettled = true
        hand.result = 'surrender'
        hands[spot.activeHandIndex] = hand
        spot.hands = hands
        spot.playerBankroll += hand.bet / 2
        spots[context.activeSpotIndex] = spot

        return { spots, message: 'Surrendered' }
      }),
      moveToNextHand: assign(({ context }) => {
        const spots = [...context.spots]
        const spot = { ...spots[context.activeSpotIndex] }
        spot.activeHandIndex += 1
        spots[context.activeSpotIndex] = spot
        return { spots, message: `Hand ${spot.activeHandIndex + 1}` }
      }),
      moveToNextSpot: assign(({ context }) => {
        const nextIndex = findNextActiveSpotIndex(context.spots, context.activeSpotIndex)
        return { activeSpotIndex: nextIndex, message: 'Next player' }
      }),
      revealDealerCard: assign({
        dealerHand: ({ context }) =>
          context.dealerHand.map((card) => ({ ...card, faceUp: true })),
      }),
      dealerHit: assign(({ context }) => {
        const { card, shoe } = dealCard(context.shoe)
        return { shoe, dealerHand: [...context.dealerHand, card] }
      }),
      settleAllSpots: assign(({ context }) => {
        const dealerValue = calculateFullHandValue(context.dealerHand)
        const dealerBust = dealerValue > 21
        const dealerBlackjack = isBlackjack(context.dealerHand)

        const settledSpots = context.spots.map((spot) => {
          if (spot.bet === 0) return spot

          let bankroll = spot.playerBankroll

          const settledHands = spot.hands.map((hand): Hand => {
            if (hand.isSettled) return hand

            const playerValue = calculateFullHandValue(hand.cards)
            const playerBlackjack = isBlackjack(hand.cards) && !hand.isSplit
            const playerBust = playerValue > 21

            let result: Hand['result']

            if (playerBust) {
              result = 'lose'
            } else if (playerBlackjack && !dealerBlackjack) {
              result = 'blackjack'
              bankroll += hand.bet * 2.5
            } else if (dealerBust) {
              result = 'win'
              bankroll += hand.bet * 2
            } else if (playerBlackjack && dealerBlackjack) {
              result = 'push'
              bankroll += hand.bet
            } else if (dealerBlackjack) {
              result = 'lose'
            } else if (playerValue > dealerValue) {
              result = 'win'
              bankroll += hand.bet * 2
            } else if (playerValue < dealerValue) {
              result = 'lose'
            } else {
              result = 'push'
              bankroll += hand.bet
            }

            return { ...hand, isSettled: true, result }
          })

          return { ...spot, hands: settledHands, playerBankroll: bankroll }
        })

        return {
          spots: settledSpots,
          message: 'Round complete',
        }
      }),
      prepareNewRound: assign(({ context }) => {
        const spots = context.spots.map((spot): MultiplayerSpot => ({
          ...spot,
          bet: 0,
          hands: [],
          activeHandIndex: 0,
          sideBetResults: createEmptySideBetResults(),
        }))

        return {
          spots,
          dealerHand: [],
          activeSpotIndex: 0,
          message: 'Place your bets',
          roundNumber: context.roundNumber + 1,
        }
      }),
      autoStandOnTimeout: assign({
        message: 'Player timed out - auto stand',
      }),
    },
  }).createMachine({
    id: 'multiplayerBlackjack',
    initial: 'betting',
    context: {
      shoe: createShoe(),
      spots: initialSpots,
      activeSpotIndex: 0,
      dealerHand: [],
      message: 'Place your bets',
      roundNumber: 1,
    },
    states: {
      betting: {
        on: {
          PLACE_BET: {
            actions: 'placeBet',
          },
          ALL_BETS_IN: {
            guard: 'hasAnyBet',
            target: 'dealing',
          },
        },
      },
      dealing: {
        entry: 'dealInitialCards',
        always: [
          {
            guard: ({ context }) =>
              context.dealerHand[0]?.rank === 'A' && anyPlayerHasBlackjackFn(context.spots),
            target: 'evenMoney',
          },
          {
            guard: 'dealerShowsAce',
            target: 'insurance',
          },
          {
            guard: 'allActiveSpotsHaveBlackjack',
            target: 'dealerTurn',
          },
          {
            target: 'playerTurn',
          },
        ],
      },
      evenMoney: {
        on: {
          TAKE_EVEN_MONEY: {
            // Simplified: handle even money for all BJ hands at once
            target: 'insurance',
          },
          DECLINE_EVEN_MONEY: {
            target: 'insurance',
          },
          ALL_EVEN_MONEY_IN: [
            {
              guard: 'allActiveSpotsHaveBlackjack',
              target: 'checkBlackjacks',
            },
            {
              target: 'insurance',
            },
          ],
        },
      },
      insurance: {
        on: {
          TAKE_INSURANCE: {
            // Collected per-player
          },
          DECLINE_INSURANCE: {
            // Collected per-player
          },
          ALL_INSURANCE_IN: {
            target: 'checkBlackjacks',
          },
        },
      },
      checkBlackjacks: {
        always: [
          {
            guard: 'dealerHasBlackjack',
            target: 'dealerTurn',
          },
          {
            guard: 'allActiveSpotsHaveBlackjack',
            target: 'dealerTurn',
          },
          {
            target: 'playerTurn',
          },
        ],
      },
      playerTurn: {
        always: [
          {
            guard: 'allSpotsSettled',
            target: 'dealerTurn',
          },
          {
            guard: ({ context }) =>
              currentSpotSettledFn(context) &&
              findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1,
            actions: 'moveToNextSpot',
            target: 'playerTurn',
            reenter: true,
          },
          {
            guard: ({ context }) => {
              const hand = getCurrentHand(context)
              const spot = getCurrentSpot(context)
              return (
                hand !== undefined &&
                calculateHandValue(hand.cards) === 21 &&
                spotHasMoreHands(spot)
              )
            },
            actions: 'moveToNextHand',
            target: 'playerTurn',
            reenter: true,
          },
          {
            guard: ({ context }) => {
              const hand = getCurrentHand(context)
              return (
                hand !== undefined &&
                calculateHandValue(hand.cards) === 21 &&
                findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1
              )
            },
            actions: 'moveToNextSpot',
            target: 'playerTurn',
            reenter: true,
          },
          {
            guard: 'currentHandHas21',
            target: 'dealerTurn',
          },
          // Split aces auto-advance
          {
            guard: ({ context }) => {
              const hand = getCurrentHand(context)
              const spot = getCurrentSpot(context)
              return hand !== undefined && hand.isSplitAces && spotHasMoreHands(spot)
            },
            actions: 'moveToNextHand',
            target: 'playerTurn',
            reenter: true,
          },
          {
            guard: ({ context }) => {
              const hand = getCurrentHand(context)
              return (
                hand !== undefined &&
                hand.isSplitAces &&
                findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1
              )
            },
            actions: 'moveToNextSpot',
            target: 'playerTurn',
            reenter: true,
          },
          {
            guard: 'currentHandIsSplitAces',
            target: 'dealerTurn',
          },
        ],
        on: {
          HIT: {
            guard: ({ context, event }) => {
              const activeSpot = context.spots[context.activeSpotIndex]
              if (activeSpot?.playerId !== event.playerId) return false
              const hand = getCurrentHand(context)
              return (
                hand !== undefined &&
                !hand.isSplitAces &&
                !isBust(hand.cards) &&
                calculateHandValue(hand.cards) < 21
              )
            },
            actions: 'hit',
            target: 'afterHit',
          },
          STAND: [
            {
              guard: ({ context, event }) => {
                const activeSpot = context.spots[context.activeSpotIndex]
                if (activeSpot?.playerId !== event.playerId) return false
                return spotHasMoreHands(getCurrentSpot(context))
              },
              actions: ['stand', 'moveToNextHand'],
              target: 'playerTurn',
              reenter: true,
            },
            {
              guard: ({ context, event }) => {
                const activeSpot = context.spots[context.activeSpotIndex]
                if (activeSpot?.playerId !== event.playerId) return false
                return findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1
              },
              actions: ['stand', 'moveToNextSpot'],
              target: 'playerTurn',
              reenter: true,
            },
            {
              guard: 'isActivePlayer',
              actions: 'stand',
              target: 'dealerTurn',
            },
          ],
          DOUBLE: {
            guard: ({ context, event }) => {
              const activeSpot = context.spots[context.activeSpotIndex]
              if (activeSpot?.playerId !== event.playerId) return false
              const hand = getCurrentHand(context)
              return (
                hand !== undefined &&
                canDoubleDown(hand.cards) &&
                !hand.isSplitAces &&
                activeSpot.playerBankroll >= hand.bet
              )
            },
            actions: 'doubleDown',
            target: 'afterDouble',
          },
          SPLIT: {
            guard: ({ context, event }) => {
              const activeSpot = context.spots[context.activeSpotIndex]
              if (activeSpot?.playerId !== event.playerId) return false
              const hand = getCurrentHand(context)
              return (
                hand !== undefined &&
                canSplit(hand.cards) &&
                activeSpot.hands.length < 4 &&
                activeSpot.playerBankroll >= hand.bet
              )
            },
            actions: 'split',
            target: 'playerTurn',
            reenter: true,
          },
          SURRENDER: {
            guard: ({ context, event }) => {
              const activeSpot = context.spots[context.activeSpotIndex]
              if (activeSpot?.playerId !== event.playerId) return false
              const hand = getCurrentHand(context)
              return (
                hand !== undefined &&
                hand.cards.length === 2 &&
                !hand.isSplit &&
                activeSpot.activeHandIndex === 0
              )
            },
            actions: 'surrender',
            target: 'playerTurn',
            reenter: true,
          },
          PLAYER_TIMEOUT: [
            {
              guard: 'hasMoreHandsInSpot',
              actions: ['autoStandOnTimeout', 'moveToNextHand'],
              target: 'playerTurn',
              reenter: true,
            },
            {
              guard: 'hasMoreSpots',
              actions: ['autoStandOnTimeout', 'moveToNextSpot'],
              target: 'playerTurn',
              reenter: true,
            },
            {
              actions: 'autoStandOnTimeout',
              target: 'dealerTurn',
            },
          ],
        },
      },
      afterDouble: {
        always: [
          {
            guard: 'hasMoreHandsInSpot',
            actions: 'moveToNextHand',
            target: 'playerTurn',
          },
          {
            guard: 'hasMoreSpots',
            actions: 'moveToNextSpot',
            target: 'playerTurn',
          },
          {
            target: 'dealerTurn',
          },
        ],
      },
      afterHit: {
        always: [
          {
            guard: ({ context }) => {
              const hand = getCurrentHand(context)
              return (
                hand !== undefined && !isBust(hand.cards) && calculateHandValue(hand.cards) < 21
              )
            },
            target: 'playerTurn',
          },
          {
            guard: 'allSpotsSettled',
            target: 'dealerTurn',
          },
          {
            guard: 'hasMoreHandsInSpot',
            actions: 'moveToNextHand',
            target: 'playerTurn',
          },
          {
            guard: 'hasMoreSpots',
            actions: 'moveToNextSpot',
            target: 'playerTurn',
          },
          {
            target: 'dealerTurn',
          },
        ],
      },
      dealerTurn: {
        entry: 'revealDealerCard',
        always: [
          {
            guard: 'noActivePlayerHands',
            target: 'settlement',
          },
          {
            guard: 'shouldDealerHit',
            actions: 'dealerHit',
            target: 'dealerTurn',
            reenter: true,
          },
          {
            target: 'settlement',
          },
        ],
      },
      settlement: {
        entry: 'settleAllSpots',
        on: {
          NEW_ROUND: {
            target: 'betting',
            actions: 'prepareNewRound',
          },
        },
      },
    },
  })
}

// Fix the STAND transition — use array format like the single-player machine
// We handle STAND with multiple transitions by checking guards at the event level
