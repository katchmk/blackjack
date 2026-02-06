import { createActorContext } from '@xstate/react'
import { blackjackMachine } from './machine'
import { canSplit, canDoubleDown, isBust, calculateHandValue, isHard17OrMore } from './scoring'
import { MIN_BET } from './types'
import type { SnapshotFrom } from 'xstate'

export const GameContext = createActorContext(blackjackMachine)

// Snapshot type for selectors
type GameSnapshot = SnapshotFrom<typeof blackjackMachine>

// Phase selectors
export const selectIsBetting = (snap: GameSnapshot) => snap.matches('betting')
export const selectIsPlayerTurn = (snap: GameSnapshot) => snap.matches('playerTurn')
export const selectIsEvenMoney = (snap: GameSnapshot) => snap.matches('evenMoney')
export const selectIsInsurance = (snap: GameSnapshot) => snap.matches('insurance')
export const selectIsSettlement = (snap: GameSnapshot) => snap.matches('settlement')
export const selectIsDealerTurn = (snap: GameSnapshot) => snap.matches('dealerTurn')
export const selectIsPlayerBust = (snap: GameSnapshot) => snap.matches('bust')
export const selectIsPlaying = (snap: GameSnapshot) =>
  snap.matches('playerTurn') || snap.matches('dealerTurn') || snap.matches('insurance') || snap.matches('evenMoney')
export const selectShowDealerValue = (snap: GameSnapshot) =>
  snap.matches('dealerTurn') || snap.matches('settlement')

// Derived state selectors
export const selectCurrentSpot = (snap: GameSnapshot) =>
  snap.context.spots[snap.context.activeSpotIndex]

export const selectCurrentHand = (snap: GameSnapshot) => {
  const spot = snap.context.spots[snap.context.activeSpotIndex]
  return spot?.hands[spot.activeHandIndex]
}

export const selectTotalBets = (snap: GameSnapshot) =>
  snap.context.spots.reduce((sum, s) => {
    const mainBet = s.hands.length > 0
      ? s.hands.reduce((handSum, h) => handSum + h.bet, 0)
      : s.bet
    return sum + mainBet + s.sideBets.twentyOnePlusThree + s.sideBets.perfectPairs
  }, 0)

export const selectCanDeal = (snap: GameSnapshot) =>
  snap.context.spots.some((s) => s.bet >= MIN_BET)

export const selectPreviousBetsTotal = (snap: GameSnapshot) =>
  snap.context.previousBets
    ? snap.context.previousBets.spots.reduce(
        (sum, s) => sum + s.bet + s.sideBets.twentyOnePlusThree + s.sideBets.perfectPairs,
        0
      )
    : 0

export const selectCanRebet = (snap: GameSnapshot) => {
  const prev = snap.context.previousBets
  if (!prev) return false
  const total = prev.spots.reduce(
    (sum, s) => sum + s.bet + s.sideBets.twentyOnePlusThree + s.sideBets.perfectPairs,
    0
  )
  const isSettlement = snap.matches('settlement')
  const totalBets = selectTotalBets(snap)
  return total > 0 && snap.context.bankroll >= total && (isSettlement || totalBets === 0)
}

export const selectCanDoubleBet = (snap: GameSnapshot) => {
  const currentBet = snap.context.spots[snap.context.bettingSpotIndex]?.bet ?? 0
  return currentBet > 0 && snap.context.bankroll >= currentBet
}

export const selectInsuranceCost = (snap: GameSnapshot) =>
  snap.context.spots.reduce((sum, s) => sum + s.bet, 0) / 2

export const selectCanAffordInsurance = (snap: GameSnapshot) =>
  snap.context.bankroll >= selectInsuranceCost(snap)

export const selectCanHit = (snap: GameSnapshot) => {
  if (!snap.matches('playerTurn')) return false
  const hand = selectCurrentHand(snap)
  return !!hand && !hand.isSplitAces && !isBust(hand.cards) && calculateHandValue(hand.cards) < 21
}

export const selectCanDouble = (snap: GameSnapshot) => {
  if (!snap.matches('playerTurn')) return false
  const hand = selectCurrentHand(snap)
  return !!hand && canDoubleDown(hand.cards) && !hand.isSplitAces && snap.context.bankroll >= hand.bet
}

export const selectCanSplit = (snap: GameSnapshot) => {
  if (!snap.matches('playerTurn')) return false
  const spot = selectCurrentSpot(snap)
  const hand = selectCurrentHand(snap)
  return !!hand && canSplit(hand.cards) && spot.hands.length < 4 && snap.context.bankroll >= hand.bet
}

export const selectCanSurrender = (snap: GameSnapshot) => {
  if (!snap.matches('playerTurn')) return false
  const spot = selectCurrentSpot(snap)
  const hand = selectCurrentHand(snap)
  return !!hand && hand.cards.length === 2 && !hand.isSplit && spot.activeHandIndex === 0
}

export const selectIsHard17Plus = (snap: GameSnapshot) => {
  const hand = selectCurrentHand(snap)
  return hand ? isHard17OrMore(hand.cards) : false
}

// Combined selector for TableLayout — returns all derived state in one call
export function selectTableState(snap: GameSnapshot) {
  return {
    // Context
    spots: snap.context.spots,
    activeSpotIndex: snap.context.activeSpotIndex,
    dealerHand: snap.context.dealerHand,
    bankroll: snap.context.bankroll,
    insuranceBet: snap.context.insuranceBet,
    // Phase
    isBetting: selectIsBetting(snap),
    isPlayerTurn: selectIsPlayerTurn(snap),
    isEvenMoney: selectIsEvenMoney(snap),
    isInsurance: selectIsInsurance(snap),
    isSettlement: selectIsSettlement(snap),
    isDealerTurn: selectIsDealerTurn(snap),
    isPlayerBust: selectIsPlayerBust(snap),
    isPlaying: selectIsPlaying(snap),
    showDealerValue: selectShowDealerValue(snap),
    // Derived
    totalBets: selectTotalBets(snap),
    canDeal: selectCanDeal(snap),
    canRebet: selectCanRebet(snap),
    previousBetsTotal: selectPreviousBetsTotal(snap),
    canDoubleBet: selectCanDoubleBet(snap),
    insuranceCost: selectInsuranceCost(snap),
    canAffordInsurance: selectCanAffordInsurance(snap),
    canHit: selectCanHit(snap),
    canDouble: selectCanDouble(snap),
    canSplit: selectCanSplit(snap),
    canSurrender: selectCanSurrender(snap),
    isHard17Plus: selectIsHard17Plus(snap),
  }
}

// Shallow compare for object selectors — avoids re-renders when values haven't changed
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

// Combined selector for BankrollStats
export function selectBankrollStats(snap: GameSnapshot) {
  return {
    bankroll: snap.context.bankroll,
    lastWin: snap.context.lastWin,
    lastWinAmount: snap.context.lastWinAmount,
    totalBets: selectTotalBets(snap),
  }
}
