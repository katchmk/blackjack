import { setup, assign } from 'xstate'
import type { GameContext, Hand, Card, SideBets, SideBetResults, Spot, PreviousBets } from './types'
import { INITIAL_BANKROLL, MIN_BET, SIDE_BET_PAYOUTS, SPOT_COUNT } from './types'
import { createShoe, dealCard, shouldReshuffle } from './deck'
import {
  calculateHandValue,
  calculateFullHandValue,
  isBust,
  isBlackjack,
  isTripleSeven,
  canSplit,
  canDoubleDown,
  evaluate21Plus3,
  evaluatePerfectPairs,
} from './scoring'

type SideBetType = keyof SideBets

type GameEvent =
  | { type: 'SELECT_SPOT'; spotIndex: number }
  | { type: 'ADD_BET'; amount: number }
  | { type: 'DOUBLE_BET' }
  | { type: 'CLEAR_BET' }
  | { type: 'CLEAR_ALL_BETS' }
  | { type: 'ADD_SIDE_BET'; betType: SideBetType; amount: number }
  | { type: 'REBET' }
  | { type: 'DEAL' }
  | { type: 'TAKE_EVEN_MONEY' }
  | { type: 'DECLINE_EVEN_MONEY' }
  | { type: 'TAKE_INSURANCE' }
  | { type: 'DECLINE_INSURANCE' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE' }
  | { type: 'SPLIT' }
  | { type: 'SURRENDER' }
  | { type: 'NEW_ROUND' }

function createEmptySideBets(): SideBets {
  return {
    twentyOnePlusThree: 0,
    perfectPairs: 0,
  }
}

function createEmptySideBetResults(): SideBetResults {
  return {
    twentyOnePlusThree: null,
    perfectPairs: null,
  }
}

function createEmptySpot(id: number): Spot {
  return {
    id,
    bet: 0,
    sideBets: createEmptySideBets(),
    sideBetResults: createEmptySideBetResults(),
    hands: [],
    activeHandIndex: 0,
  }
}

function createInitialSpots(): Spot[] {
  return Array.from({ length: SPOT_COUNT }, (_, i) => createEmptySpot(i))
}

function createInitialContext(): GameContext {
  return {
    shoe: createShoe(),
    spots: createInitialSpots(),
    activeSpotIndex: 0,
    bettingSpotIndex: 3, // Start in middle spot
    dealerHand: [],
    bankroll: INITIAL_BANKROLL,
    insuranceBet: 0,
    message: 'Select a spot and place your bet',
    previousBets: null,
    lastWin: 0,
    lastWinAmount: 0,
  }
}

function getTotalBetAmount(bets: PreviousBets): number {
  return bets.spots.reduce(
    (sum, spot) => sum + spot.bet + spot.sideBets.twentyOnePlusThree + spot.sideBets.perfectPairs,
    0
  )
}

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

// Helper functions
function getCurrentSpot(context: GameContext): Spot {
  return context.spots[context.activeSpotIndex]
}

function getCurrentHand(context: GameContext): Hand | undefined {
  const spot = getCurrentSpot(context)
  return spot.hands[spot.activeHandIndex]
}

function getActiveSpots(spots: Spot[]): Spot[] {
  return spots.filter((s) => s.bet > 0)
}

function getTotalBets(spots: Spot[]): number {
  return spots.reduce((total, spot) => {
    return (
      total +
      spot.bet +
      spot.sideBets.twentyOnePlusThree +
      spot.sideBets.perfectPairs
    )
  }, 0)
}

function findNextActiveSpotIndex(spots: Spot[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < spots.length; i++) {
    const spot = spots[i]
    // Skip spots that are settled, bust, or have blackjack (blackjack doesn't need player action)
    if (spot.bet > 0 && spot.hands.some((h) => !h.isSettled && !isBust(h.cards) && !isBlackjack(h.cards))) {
      return i
    }
  }
  return -1 // No more active spots
}

function allSpotsSettled(spots: Spot[]): boolean {
  return getActiveSpots(spots).every((spot) =>
    spot.hands.every((h) => h.isSettled || isBust(h.cards) || isBlackjack(h.cards))
  )
}

function spotHasMoreHands(spot: Spot): boolean {
  return spot.activeHandIndex < spot.hands.length - 1
}

function currentSpotSettled(context: GameContext): boolean {
  const spot = getCurrentSpot(context)
  return spot.hands.every((h) => h.isSettled || isBust(h.cards) || isBlackjack(h.cards))
}

function noActivePlayerHands(spots: Spot[]): boolean {
  const activeSpots = getActiveSpots(spots)
  if (activeSpots.length === 0) return false
  // Check if all hands are busted, surrendered, or blackjack (no need for dealer to draw)
  return activeSpots.every((spot) =>
    spot.hands.every((h) => isBust(h.cards) || h.result === 'surrender' || isBlackjack(h.cards))
  )
}

function anyPlayerHasBlackjack(spots: Spot[]): boolean {
  return getActiveSpots(spots).some((spot) =>
    spot.hands.some((h) => isBlackjack(h.cards) && !h.isSettled)
  )
}

function allActiveSpotsHaveBlackjack(spots: Spot[]): boolean {
  const activeSpots = getActiveSpots(spots)
  return activeSpots.length > 0 && activeSpots.every((spot) =>
    spot.hands.every((h) => isBlackjack(h.cards))
  )
}

export const blackjackMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  guards: {
    canAffordBet: ({ context }, params: { amount: number }) => {
      return context.bankroll >= params.amount
    },
    hasAnyBet: ({ context }) => {
      return context.spots.some((s) => s.bet >= MIN_BET)
    },
    dealerShowsAce: ({ context }) => {
      return context.dealerHand.length > 0 && context.dealerHand[0].rank === 'A'
    },
    canAffordInsurance: ({ context }) => {
      const totalBets = context.spots.reduce((sum, s) => sum + s.bet, 0)
      return context.bankroll >= totalBets / 2
    },
    dealerHasBlackjack: ({ context }) => {
      return isBlackjack(context.dealerHand)
    },
    canHit: ({ context }) => {
      const hand = getCurrentHand(context)
      return hand !== undefined && !hand.isSplitAces && !isBust(hand.cards) && calculateHandValue(hand.cards) < 21
    },
    canDoubleDown: ({ context }) => {
      const hand = getCurrentHand(context)
      return (
        hand !== undefined &&
        canDoubleDown(hand.cards) &&
        !hand.isSplitAces &&
        context.bankroll >= hand.bet
      )
    },
    canSplit: ({ context }) => {
      const spot = getCurrentSpot(context)
      const hand = getCurrentHand(context)
      return (
        hand !== undefined &&
        canSplit(hand.cards) &&
        spot.hands.length < 4 &&
        context.bankroll >= hand.bet
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
      const spot = getCurrentSpot(context)
      return spotHasMoreHands(spot)
    },
    hasMoreSpots: ({ context }) => {
      return findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1
    },
    allSpotsSettled: ({ context }) => {
      return allSpotsSettled(context.spots)
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
      return currentSpotSettled(context)
    },
    shouldDealerHit: ({ context }) => {
      const value = calculateFullHandValue(context.dealerHand)
      return value < 17
    },
    noActivePlayerHands: ({ context }) => {
      return noActivePlayerHands(context.spots)
    },
    anyPlayerHasBlackjack: ({ context }) => {
      return anyPlayerHasBlackjack(context.spots)
    },
    allActiveSpotsHaveBlackjack: ({ context }) => {
      return allActiveSpotsHaveBlackjack(context.spots)
    },
    canRebet: ({ context }) => {
      if (!context.previousBets) return false
      const totalNeeded = getTotalBetAmount(context.previousBets)
      return totalNeeded > 0 && context.bankroll >= totalNeeded
    },
  },
  actions: {
    selectSpot: assign({
      bettingSpotIndex: (_, params: { spotIndex: number }) => params.spotIndex,
    }),
    addBet: assign(({ context }, params: { amount: number }) => {
      const spots = [...context.spots]
      const spot = { ...spots[context.bettingSpotIndex] }
      spot.bet += params.amount
      spots[context.bettingSpotIndex] = spot
      return {
        spots,
        bankroll: context.bankroll - params.amount,
      }
    }),
    doubleBet: assign(({ context }) => {
      const spots = [...context.spots]
      const spot = { ...spots[context.bettingSpotIndex] }
      const currentBet = spot.bet
      if (currentBet === 0 || context.bankroll < currentBet) return {}
      spot.bet = currentBet * 2
      spots[context.bettingSpotIndex] = spot
      return {
        spots,
        bankroll: context.bankroll - currentBet,
      }
    }),
    clearBet: assign(({ context }) => {
      const spots = [...context.spots]
      const spot = { ...spots[context.bettingSpotIndex] }
      const refund =
        spot.bet + spot.sideBets.twentyOnePlusThree + spot.sideBets.perfectPairs
      spot.bet = 0
      spot.sideBets = createEmptySideBets()
      spots[context.bettingSpotIndex] = spot
      return {
        spots,
        bankroll: context.bankroll + refund,
      }
    }),
    clearAllBets: assign(({ context }) => {
      const totalRefund = getTotalBets(context.spots)
      return {
        spots: createInitialSpots(),
        bankroll: context.bankroll + totalRefund,
      }
    }),
    rebet: assign(({ context }) => {
      if (!context.previousBets) return {}

      const totalNeeded = getTotalBetAmount(context.previousBets)
      if (context.bankroll < totalNeeded) return {}

      const spots = context.spots.map((spot, index) => {
        const prevBet = context.previousBets!.spots[index]
        return {
          ...spot,
          bet: prevBet.bet,
          sideBets: { ...prevBet.sideBets },
        }
      })

      return {
        spots,
        bankroll: context.bankroll - totalNeeded,
      }
    }),
    addSideBet: assign(
      ({ context }, params: { betType: SideBetType; amount: number }) => {
        const spots = [...context.spots]
        const spot = { ...spots[context.bettingSpotIndex] }
        spot.sideBets = {
          ...spot.sideBets,
          [params.betType]: spot.sideBets[params.betType] + params.amount,
        }
        spots[context.bettingSpotIndex] = spot
        return {
          spots,
          bankroll: context.bankroll - params.amount,
        }
      }
    ),
    dealInitialCards: assign(({ context }) => {
      let shoe = context.shoe
      if (shouldReshuffle(shoe)) {
        shoe = createShoe()
      }

      const activeSpotIndices = context.spots
        .map((s, i) => (s.bet > 0 ? i : -1))
        .filter((i) => i !== -1)

      // Deal cards to each active spot
      const spots = context.spots.map((spot) => {
        if (spot.bet === 0) return spot

        const playerCards: Card[] = []

        // Deal 2 cards to this spot
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

      // Evaluate side bets for each spot and pay out immediately
      let sideBetWinnings = 0
      const spotsWithSideBets = spots.map((spot) => {
        if (spot.bet === 0 || spot.hands.length === 0) return spot

        const playerCards = spot.hands[0].cards
        const sideBetResults: SideBetResults = {
          twentyOnePlusThree:
            spot.sideBets.twentyOnePlusThree > 0
              ? evaluate21Plus3(playerCards, dealerCards[0])
              : null,
          perfectPairs:
            spot.sideBets.perfectPairs > 0
              ? evaluatePerfectPairs(playerCards)
              : null,
        }

        // Pay out winning side bets immediately
        if (spot.sideBets.twentyOnePlusThree > 0 && sideBetResults.twentyOnePlusThree) {
          const payout = SIDE_BET_PAYOUTS.twentyOnePlusThree[sideBetResults.twentyOnePlusThree]
          sideBetWinnings += spot.sideBets.twentyOnePlusThree * payout
        }
        if (spot.sideBets.perfectPairs > 0 && sideBetResults.perfectPairs) {
          const payout = SIDE_BET_PAYOUTS.perfectPairs[sideBetResults.perfectPairs]
          sideBetWinnings += spot.sideBets.perfectPairs * payout
        }

        return {
          ...spot,
          sideBetResults,
        }
      })

      // Find first spot that needs player action (has bet and no blackjack)
      const firstPlayableSpot = spotsWithSideBets.findIndex(
        (spot) => spot.bet > 0 && spot.hands.length > 0 && !isBlackjack(spot.hands[0].cards)
      )
      const firstActiveSpot = firstPlayableSpot !== -1 ? firstPlayableSpot : (activeSpotIndices[0] ?? 0)

      // Store current bets for rebet functionality
      const previousBets: PreviousBets = {
        spots: context.spots.map((spot) => ({
          bet: spot.bet,
          sideBets: { ...spot.sideBets },
        })),
      }

      return {
        shoe,
        spots: spotsWithSideBets,
        dealerHand: dealerCards,
        activeSpotIndex: firstActiveSpot,
        message: `Spot ${firstActiveSpot + 1} - Your turn`,
        previousBets,
        bankroll: context.bankroll + sideBetWinnings,
      }
    }),
    takeInsurance: assign(({ context }) => {
      const totalBets = context.spots.reduce((sum, s) => sum + s.bet, 0)
      return {
        insuranceBet: totalBets / 2,
        bankroll: context.bankroll - totalBets / 2,
      }
    }),
    takeEvenMoney: assign(({ context }) => {
      let bankroll = context.bankroll
      const spots = context.spots.map((spot) => {
        if (spot.bet === 0 || spot.hands.length === 0) return spot

        const hands = spot.hands.map((hand): Hand => {
          // Only apply to blackjack hands that aren't settled
          if (!isBlackjack(hand.cards) || hand.isSettled) return hand

          // Pay 1:1 (return bet + 1x bet = 2x bet)
          bankroll += hand.bet * 2
          return {
            ...hand,
            isSettled: true,
            result: 'win', // Even money is a 1:1 win
          }
        })

        return { ...spot, hands }
      })

      return {
        spots,
        bankroll,
        message: 'Even money taken',
      }
    }),
    hit: assign(({ context }) => {
      const { card, shoe } = dealCard(context.shoe)
      const spots = [...context.spots]
      const spot = { ...spots[context.activeSpotIndex] }
      const hands = [...spot.hands]
      const hand = { ...hands[spot.activeHandIndex] }
      hand.cards = [...hand.cards, card]

      // Check for triple 7s bonus (only award once per hand)
      let bonusAwarded = 0
      let newBankroll = context.bankroll
      if (!hand.tripleSevensAwarded && isTripleSeven(hand.cards)) {
        hand.tripleSevensAwarded = true
        bonusAwarded = hand.bet
        newBankroll += bonusAwarded
      }

      // Mark hand as settled if busted
      const busted = isBust(hand.cards)
      if (busted) {
        hand.isSettled = true
        hand.result = 'lose'
      }

      hands[spot.activeHandIndex] = hand
      spot.hands = hands
      spots[context.activeSpotIndex] = spot

      let message = `Spot ${context.activeSpotIndex + 1} - Your turn`
      if (bonusAwarded > 0) {
        message = `Triple 7s! Bonus +$${bonusAwarded}!`
      } else if (busted) {
        message = 'Bust!'
      }

      return {
        shoe,
        spots,
        bankroll: newBankroll,
        message,
      }
    }),
    stand: assign(({ context }) => ({
      message: `Spot ${context.activeSpotIndex + 1} - Stand`,
    })),
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

      // Check for triple 7s bonus (only award once per hand)
      let bonusAwarded = 0
      let newBankroll = context.bankroll - originalBet // Deduct the double amount
      if (!hand.tripleSevensAwarded && isTripleSeven(hand.cards)) {
        hand.tripleSevensAwarded = true
        bonusAwarded = hand.bet // Award based on doubled bet
        newBankroll += bonusAwarded
      }

      hands[spot.activeHandIndex] = hand
      spot.hands = hands
      spots[context.activeSpotIndex] = spot

      return {
        shoe,
        spots,
        bankroll: newBankroll,
        message: bonusAwarded > 0 ? `Doubled + Triple 7s! Bonus +$${bonusAwarded}!` : 'Doubled down',
      }
    }),
    split: assign(({ context }) => {
      const spots = [...context.spots]
      const spot = { ...spots[context.activeSpotIndex] }
      const hands = [...spot.hands]
      const hand = hands[spot.activeHandIndex]
      const [card1, card2] = hand.cards

      // Check if splitting aces - only 1 card dealt per hand, no further actions allowed
      const splittingAces = card1.rank === 'A'

      let { card: newCard1, shoe } = dealCard(context.shoe)
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
      spots[context.activeSpotIndex] = spot

      return {
        shoe: finalShoe,
        spots,
        bankroll: context.bankroll - hand.bet,
        message: 'Hand split',
      }
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
      spots[context.activeSpotIndex] = spot

      return {
        spots,
        bankroll: context.bankroll + hand.bet / 2,
        message: 'Surrendered',
      }
    }),
    moveToNextHand: assign(({ context }) => {
      const spots = [...context.spots]
      const spot = { ...spots[context.activeSpotIndex] }
      spot.activeHandIndex += 1
      spots[context.activeSpotIndex] = spot
      return {
        spots,
        message: `Spot ${context.activeSpotIndex + 1} - Hand ${spot.activeHandIndex + 1}`,
      }
    }),
    moveToNextSpot: assign(({ context }) => {
      const nextIndex = findNextActiveSpotIndex(context.spots, context.activeSpotIndex)
      return {
        activeSpotIndex: nextIndex,
        message: `Spot ${nextIndex + 1} - Your turn`,
      }
    }),
    revealDealerCard: assign({
      dealerHand: ({ context }) =>
        context.dealerHand.map((card) => ({ ...card, faceUp: true })),
    }),
    dealerHit: assign(({ context }) => {
      const { card, shoe } = dealCard(context.shoe)
      return {
        shoe,
        dealerHand: [...context.dealerHand, card],
      }
    }),
    settleAllSpots: assign(({ context }) => {
      const dealerValue = calculateFullHandValue(context.dealerHand)
      const dealerBust = dealerValue > 21
      const dealerBlackjack = isBlackjack(context.dealerHand)

      let bankroll = context.bankroll
      let spotWins = 0
      let spotLosses = 0

      // Handle insurance
      if (context.insuranceBet > 0) {
        if (dealerBlackjack) {
          bankroll += context.insuranceBet * 3
        }
      }

      const settledSpots = context.spots.map((spot) => {
        if (spot.bet === 0) return spot

        // Settle hands
        const settledHands = spot.hands.map((hand): Hand => {
          // Handle already-settled hands (bust during play, surrender, even money)
          if (hand.isSettled) {
            if (hand.result === 'lose') {
              spotLosses++
            } else if (hand.result === 'win' || hand.result === 'blackjack') {
              spotWins++
            } else if (hand.result === 'surrender') {
              spotLosses++
            }
            return hand
          }

          const playerValue = calculateFullHandValue(hand.cards)
          const playerBlackjack = isBlackjack(hand.cards) && !hand.isSplit
          const playerBust = playerValue > 21

          let result: Hand['result']

          if (playerBust) {
            result = 'lose'
            spotLosses++
          } else if (playerBlackjack && !dealerBlackjack) {
            result = 'blackjack'
            bankroll += hand.bet * 2.5
            spotWins++
          } else if (dealerBust) {
            result = 'win'
            bankroll += hand.bet * 2
            spotWins++
          } else if (playerBlackjack && dealerBlackjack) {
            result = 'push'
            bankroll += hand.bet
          } else if (dealerBlackjack) {
            result = 'lose'
            spotLosses++
          } else if (playerValue > dealerValue) {
            result = 'win'
            bankroll += hand.bet * 2
            spotWins++
          } else if (playerValue < dealerValue) {
            result = 'lose'
            spotLosses++
          } else {
            result = 'push'
            bankroll += hand.bet
          }

          return { ...hand, isSettled: true, result }
        })

        return { ...spot, hands: settledHands }
      })

      // Calculate lastWin (P/L) and lastWinAmount (total returned from wins)
      let lastWin = 0
      let lastWinAmount = 0

      // Insurance result
      if (context.insuranceBet > 0) {
        if (dealerBlackjack) {
          lastWin += context.insuranceBet * 2 // Won 2:1 on insurance
          lastWinAmount += context.insuranceBet * 3 // Original + 2:1 payout
        } else {
          lastWin -= context.insuranceBet // Lost insurance bet
        }
      }

      // Main bets and side bets
      for (const spot of settledSpots) {
        if (spot.bet === 0) continue

        // Main bet results
        for (const hand of spot.hands) {
          if (!hand.result) continue
          switch (hand.result) {
            case 'blackjack':
              lastWin += hand.bet * 1.5
              lastWinAmount += hand.bet * 2.5 // Original + 1.5:1 payout
              break
            case 'win':
              lastWin += hand.bet
              lastWinAmount += hand.bet * 2 // Original + 1:1 payout
              break
            case 'lose':
              lastWin -= hand.bet
              // No winAmount for losses
              break
            case 'surrender':
              lastWin -= hand.bet / 2
              lastWinAmount += hand.bet / 2 // Half bet returned
              break
            case 'push':
              lastWinAmount += hand.bet // Original returned
              break
          }
        }

        // Side bet results (already paid out during deal)
        if (spot.sideBets.twentyOnePlusThree > 0) {
          if (spot.sideBetResults.twentyOnePlusThree) {
            const payout = SIDE_BET_PAYOUTS.twentyOnePlusThree[spot.sideBetResults.twentyOnePlusThree]
            lastWin += spot.sideBets.twentyOnePlusThree * (payout - 1) // Profit only
            lastWinAmount += spot.sideBets.twentyOnePlusThree * payout // Full payout
          } else {
            lastWin -= spot.sideBets.twentyOnePlusThree // Lost side bet
          }
        }
        if (spot.sideBets.perfectPairs > 0) {
          if (spot.sideBetResults.perfectPairs) {
            const payout = SIDE_BET_PAYOUTS.perfectPairs[spot.sideBetResults.perfectPairs]
            lastWin += spot.sideBets.perfectPairs * (payout - 1) // Profit only
            lastWinAmount += spot.sideBets.perfectPairs * payout // Full payout
          } else {
            lastWin -= spot.sideBets.perfectPairs // Lost side bet
          }
        }
      }

      let message = ''
      if (spotWins > 0 && spotLosses === 0) message = 'You win!'
      else if (spotLosses > 0 && spotWins === 0) message = 'Dealer wins'
      else if (spotWins > 0 && spotLosses > 0) message = 'Mixed results'
      else message = 'Push'

      return {
        spots: settledSpots,
        bankroll,
        insuranceBet: 0,
        message,
        lastWin,
        lastWinAmount,
      }
    }),
  },
}).createMachine({
  id: 'blackjack',
  initial: 'betting',
  context: createInitialContext,
  states: {
    betting: {
      on: {
        SELECT_SPOT: {
          actions: { type: 'selectSpot', params: ({ event }) => ({ spotIndex: event.spotIndex }) },
        },
        ADD_BET: {
          guard: { type: 'canAffordBet', params: ({ event }) => ({ amount: event.amount }) },
          actions: { type: 'addBet', params: ({ event }) => ({ amount: event.amount }) },
        },
        DOUBLE_BET: {
          actions: 'doubleBet',
        },
        CLEAR_BET: {
          actions: 'clearBet',
        },
        CLEAR_ALL_BETS: {
          actions: 'clearAllBets',
        },
        REBET: {
          guard: 'canRebet',
          actions: 'rebet',
        },
        ADD_SIDE_BET: {
          guard: { type: 'canAffordBet', params: ({ event }) => ({ amount: event.amount }) },
          actions: {
            type: 'addSideBet',
            params: ({ event }) => ({ betType: event.betType, amount: event.amount }),
          },
        },
        DEAL: {
          guard: 'hasAnyBet',
          target: 'dealing',
        },
      },
    },
    dealing: {
      entry: 'dealInitialCards',
      always: [
        // If dealer shows ace and player has blackjack, offer even money first
        {
          guard: ({ context }) =>
            context.dealerHand[0]?.rank === 'A' && anyPlayerHasBlackjack(context.spots),
          target: 'evenMoney',
        },
        {
          guard: 'dealerShowsAce',
          target: 'insurance',
        },
        {
          target: 'playerTurn',
        },
      ],
    },
    evenMoney: {
      on: {
        TAKE_EVEN_MONEY: {
          actions: 'takeEvenMoney',
          target: 'afterEvenMoney',
        },
        DECLINE_EVEN_MONEY: [
          // If all spots have blackjack, skip insurance (no point insuring a blackjack)
          {
            guard: 'allActiveSpotsHaveBlackjack',
            target: 'checkBlackjacks',
          },
          // Otherwise, offer insurance for non-blackjack hands
          {
            target: 'insurance',
          },
        ],
      },
    },
    afterEvenMoney: {
      always: [
        // If all spots are now settled, skip insurance
        {
          guard: 'allSpotsSettled',
          target: 'checkBlackjacks',
        },
        // Otherwise, offer insurance for remaining hands
        {
          target: 'insurance',
        },
      ],
    },
    insurance: {
      on: {
        TAKE_INSURANCE: {
          guard: 'canAffordInsurance',
          actions: 'takeInsurance',
          target: 'checkBlackjacks',
        },
        DECLINE_INSURANCE: {
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
          target: 'playerTurn',
        },
      ],
    },
    playerTurn: {
      always: [
        // If all spots are settled, go to dealer
        {
          guard: 'allSpotsSettled',
          target: 'dealerTurn',
        },
        // If current spot is settled but there are more spots
        {
          guard: ({ context }) =>
            currentSpotSettled(context) &&
            findNextActiveSpotIndex(context.spots, context.activeSpotIndex) !== -1,
          actions: 'moveToNextSpot',
          target: 'playerTurn',
          reenter: true,
        },
        // If current hand has 21 and there are more hands in spot
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
        // If current hand has 21 and there are more spots
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
        // If current hand has 21 and no more hands/spots
        {
          guard: 'currentHandHas21',
          target: 'dealerTurn',
        },
        // Split aces - auto advance (player gets only 1 card, no further actions)
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
          guard: 'canHit',
          actions: 'hit',
          target: 'afterHit',
        },
        STAND: [
          {
            guard: 'hasMoreHandsInSpot',
            actions: 'moveToNextHand',
            target: 'playerTurn',
            reenter: true,
          },
          {
            guard: 'hasMoreSpots',
            actions: 'moveToNextSpot',
            target: 'playerTurn',
            reenter: true,
          },
          {
            target: 'dealerTurn',
          },
        ],
        DOUBLE: {
          guard: 'canDoubleDown',
          actions: 'doubleDown',
          target: 'afterDouble',
        },
        SPLIT: {
          guard: 'canSplit',
          actions: 'split',
          target: 'playerTurn',
          reenter: true,
        },
        SURRENDER: {
          guard: 'canSurrender',
          actions: 'surrender',
          target: 'playerTurn',
          reenter: true,
        },
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
        // If hand can still be played (not bust and < 21), go back to player turn
        {
          guard: ({ context }) => {
            const hand = getCurrentHand(context)
            return hand !== undefined && !isBust(hand.cards) && calculateHandValue(hand.cards) < 21
          },
          target: 'playerTurn',
        },
        // If all spots are settled, go to dealer
        {
          guard: 'allSpotsSettled',
          target: 'dealerTurn',
        },
        // If more hands in this spot
        {
          guard: 'hasMoreHandsInSpot',
          actions: 'moveToNextHand',
          target: 'playerTurn',
        },
        // If more spots to play
        {
          guard: 'hasMoreSpots',
          actions: 'moveToNextSpot',
          target: 'playerTurn',
        },
        // Otherwise go to dealer
        {
          target: 'dealerTurn',
        },
      ],
    },
    dealerTurn: {
      entry: 'revealDealerCard',
      always: [
        // If no active player hands (all busted or surrendered), skip dealer drawing
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
          actions: assign(() => ({
            spots: createInitialSpots(),
            dealerHand: [],
            activeSpotIndex: 0,
            bettingSpotIndex: 3,
            insuranceBet: 0,
            message: 'Place your bets',
          })),
        },
        REBET: {
          guard: 'canRebet',
          target: 'betting',
          actions: assign(({ context }) => {
            const totalNeeded = getTotalBetAmount(context.previousBets!)
            const spots = createInitialSpots().map((spot, index) => {
              const prevBet = context.previousBets!.spots[index]
              return {
                ...spot,
                bet: prevBet.bet,
                sideBets: { ...prevBet.sideBets },
              }
            })
            return {
              spots,
              dealerHand: [],
              activeSpotIndex: 0,
              bettingSpotIndex: 3,
              insuranceBet: 0,
              bankroll: context.bankroll - totalNeeded,
              message: 'Place your bets',
            }
          }),
        },
        DEAL: {
          guard: 'canRebet',
          target: 'dealing',
          actions: assign(({ context }) => {
            const totalNeeded = getTotalBetAmount(context.previousBets!)
            const spots = createInitialSpots().map((spot, index) => {
              const prevBet = context.previousBets!.spots[index]
              return {
                ...spot,
                bet: prevBet.bet,
                sideBets: { ...prevBet.sideBets },
              }
            })
            return {
              spots,
              dealerHand: [],
              activeSpotIndex: 0,
              bettingSpotIndex: 3,
              insuranceBet: 0,
              bankroll: context.bankroll - totalNeeded,
            }
          }),
        },
      },
    },
  },
})
