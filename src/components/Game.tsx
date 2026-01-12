import { useState } from 'react'
import { useMachine } from '@xstate/react'
import { blackjackMachine } from '../game/machine'
import { TableLayout } from './TableLayout'
import { canSplit, canDoubleDown, isBust, calculateHandValue } from '../game/scoring'
import type { SideBets, ChipValue } from '../game/types'
import { MIN_BET } from '../game/types'

export function Game() {
  const [state, send] = useMachine(blackjackMachine)
  const { context } = state
  const [selectedChip, setSelectedChip] = useState<ChipValue>(25)

  const isBetting = state.matches('betting')
  const isPlayerTurn = state.matches('playerTurn')
  const isEvenMoney = state.matches('evenMoney')
  const isInsurance = state.matches('insurance')
  const isSettlement = state.matches('settlement')
  const isDealerTurn = state.matches('dealerTurn')
  const isPlaying = isPlayerTurn || isDealerTurn || isInsurance || isEvenMoney

  // Get current spot and hand for player actions
  const currentSpot = context.spots[context.activeSpotIndex]
  const currentHand = currentSpot?.hands[currentSpot.activeHandIndex]

  const canHitNow = isPlayerTurn && currentHand && !currentHand.isSplitAces && !isBust(currentHand.cards) && calculateHandValue(currentHand.cards) < 21
  const canDoubleNow = isPlayerTurn && currentHand && canDoubleDown(currentHand.cards) && !currentHand.isSplitAces && context.bankroll >= currentHand.bet
  const canSplitNow = isPlayerTurn && currentHand && canSplit(currentHand.cards) && currentSpot.hands.length < 4 && context.bankroll >= currentHand.bet
  const canSurrenderNow = isPlayerTurn && currentHand && currentHand.cards.length === 2 && !currentHand.isSplit && currentSpot.activeHandIndex === 0

  // Calculate total bets
  const totalBets = context.spots.reduce(
    (sum, s) => sum + s.bet + s.sideBets.twentyOnePlusThree + s.sideBets.perfectPairs,
    0
  )
  const canDeal = context.spots.some((s) => s.bet >= MIN_BET)

  // Calculate previous bets total for rebet
  const previousBetsTotal = context.previousBets
    ? context.previousBets.spots.reduce(
        (sum, s) => sum + s.bet + s.sideBets.twentyOnePlusThree + s.sideBets.perfectPairs,
        0
      )
    : 0
  // During betting: only allow rebet if no bets placed yet
  // During settlement: always allow rebet (current bets will be cleared)
  const canRebet = context.previousBets && previousBetsTotal > 0 && context.bankroll >= previousBetsTotal && (isSettlement || totalBets === 0)

  // Insurance calculations
  const insuranceCost = context.spots.reduce((sum, s) => sum + s.bet, 0) / 2
  const canAffordInsurance = context.bankroll >= insuranceCost

  // Handle placing bet on table
  const handlePlaceBet = (spotIndex: number, betType: 'main' | keyof SideBets) => {
    if (context.bankroll < selectedChip) return

    // First select the spot
    send({ type: 'SELECT_SPOT', spotIndex })

    if (betType === 'main') {
      send({ type: 'ADD_BET', amount: selectedChip })
    } else {
      send({ type: 'ADD_SIDE_BET', betType, amount: selectedChip })
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <TableLayout
        spots={context.spots}
        activeSpotIndex={context.activeSpotIndex}
        dealerHand={context.dealerHand}
        isPlaying={isPlaying}
        isBetting={isBetting}
        isSettlement={isSettlement}
        isEvenMoney={isEvenMoney}
        isInsurance={isInsurance}
        isPlayerTurn={isPlayerTurn}
        isDealerTurn={isDealerTurn}
        showDealerValue={isDealerTurn || isSettlement}
        selectedChip={selectedChip}
        bankroll={context.bankroll}
        totalBets={totalBets}
        canDeal={canDeal}
        canRebet={!!canRebet}
        previousBetsTotal={previousBetsTotal}
        message={context.message}
        onTakeEvenMoney={() => send({ type: 'TAKE_EVEN_MONEY' })}
        onDeclineEvenMoney={() => send({ type: 'DECLINE_EVEN_MONEY' })}
        insuranceCost={insuranceCost}
        canAffordInsurance={canAffordInsurance}
        onTakeInsurance={() => send({ type: 'TAKE_INSURANCE' })}
        onDeclineInsurance={() => send({ type: 'DECLINE_INSURANCE' })}
        canHit={!!canHitNow}
        canStand={isPlayerTurn}
        canDouble={!!canDoubleNow}
        canSplit={!!canSplitNow}
        canSurrender={!!canSurrenderNow}
        onHit={() => send({ type: 'HIT' })}
        onStand={() => send({ type: 'STAND' })}
        onDouble={() => send({ type: 'DOUBLE' })}
        onSplit={() => send({ type: 'SPLIT' })}
        onSurrender={() => send({ type: 'SURRENDER' })}
        onSelectChip={setSelectedChip}
        onPlaceBet={handlePlaceBet}
        onClear={() => send({ type: isSettlement ? 'NEW_ROUND' : 'CLEAR_ALL_BETS' })}
        onRebet={() => send({ type: 'REBET' })}
        onDeal={() => send({ type: 'DEAL' })}
      />
    </div>
  )
}
