import { twMerge } from 'tailwind-merge'
import { Hand } from './Hand'
import { ActionButtons } from './ActionButtons'
import type { Spot, Card, SideBets, ChipValue, TwentyOnePlusThreeResult, PerfectPairsResult } from '../game/types'
import { CHIP_VALUES, SIDE_BET_PAYOUTS } from '../game/types'

interface TableLayoutProps {
  spots: Spot[]
  activeSpotIndex: number
  dealerHand: Card[]
  isPlaying: boolean
  isBetting: boolean
  isSettlement: boolean
  isEvenMoney: boolean
  isInsurance: boolean
  isPlayerTurn: boolean
  isDealerTurn: boolean
  showDealerValue: boolean
  selectedChip: ChipValue
  bankroll: number
  lastWin: number
  lastWinAmount: number
  totalBets: number
  canDeal: boolean
  canRebet: boolean
  previousBetsTotal: number
  isBust: boolean
  // Even Money
  onTakeEvenMoney: () => void
  onDeclineEvenMoney: () => void
  // Insurance
  insuranceCost: number
  insuranceBet: number
  canAffordInsurance: boolean
  onTakeInsurance: () => void
  onDeclineInsurance: () => void
  // Player actions
  canHit: boolean
  canStand: boolean
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
  showHitConfirm: boolean
  onHit: () => void
  onConfirmHit: () => void
  onCancelHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  onSurrender: () => void
  // Betting
  onSelectChip: (chip: ChipValue) => void
  onPlaceBet: (spotIndex: number, betType: 'main' | keyof SideBets) => void
  canDoubleBet: boolean
  onDoubleBet: () => void
  onClear: () => void
  onRebet: () => void
  onDeal: () => void
  onRestart: () => void
}

const chipColors: Record<ChipValue, { bg: string; border: string }> = {
  5: { bg: 'from-red-500 to-red-700', border: 'border-red-400' },
  25: { bg: 'from-green-500 to-green-700', border: 'border-green-400' },
  100: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-400' },
  500: { bg: 'from-purple-500 to-purple-700', border: 'border-purple-400' },
  1000: { bg: 'from-orange-500 to-orange-700', border: 'border-orange-400' },
}

export function TableLayout({
  spots,
  activeSpotIndex,
  dealerHand,
  isPlaying,
  isBetting,
  isSettlement,
  isEvenMoney,
  isInsurance,
  isPlayerTurn,
  isDealerTurn,
  showDealerValue,
  selectedChip,
  bankroll,
  lastWin,
  lastWinAmount,
  totalBets,
  canDeal,
  canRebet,
  previousBetsTotal,
  isBust,
  onTakeEvenMoney,
  onDeclineEvenMoney,
  insuranceCost,
  insuranceBet,
  canAffordInsurance,
  onTakeInsurance,
  onDeclineInsurance,
  canHit,
  canStand,
  canDouble,
  canSplit,
  canSurrender,
  showHitConfirm,
  onHit,
  onConfirmHit,
  onCancelHit,
  onStand,
  onDouble,
  onSplit,
  onSurrender,
  onSelectChip,
  onPlaceBet,
  canDoubleBet,
  onDoubleBet,
  onClear,
  onRebet,
  onDeal,
  onRestart,
}: TableLayoutProps) {
  const canAfford = bankroll >= selectedChip

  return (
    <div className="relative w-full">
      {/* Table felt background */}
      <div
        className={twMerge(
          'flex flex-col',
          'relative bg-linear-to-b from-emerald-700 to-emerald-800 rounded-t-[200px]',
          'border-8 border-amber-900 shadow-2xl overflow-hidden min-h-125',
        )}
      >

        {/* Side bet payouts legend */}
        <div className="absolute top-8 left-24 text-[10px] text-white/70 bg-black/20 rounded-lg p-2 z-10">
          <div className="font-bold text-white/90 mb-1">21+3 Payouts</div>
          <div>Suited Triple: 100:1</div>
          <div>Straight Flush: 40:1</div>
          <div>Three of a Kind: 30:1</div>
          <div>Straight: 10:1</div>
          <div>Flush: 5:1</div>
          <div className="font-bold text-white/90 mt-2 mb-1">Perfect Pairs</div>
          <div>Perfect Pair: 25:1</div>
          <div>Colored Pair: 12:1</div>
          <div>Mixed Pair: 6:1</div>
          <div className="font-bold text-white/90 mt-2 mb-1">Bonus</div>
          <div>Triple 7s: 1:1</div>
        </div>

        {/* Dealer area */}
        <div className="pt-4 pb-4 flex flex-col items-center">
          {dealerHand.length > 0 ? (
            <Hand
              cards={dealerHand}
              label="Dealer"
              hideValue={!showDealerValue && dealerHand.some((c) => !c.faceUp)}
            />
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="w-24 h-32 rounded-lg border-2 border-dashed border-white/20" />
            </div>
          )}
        </div>

        {/* Table rule text */}
        <div className="text-center text-white/40 text-sm tracking-widest uppercase py-2">
          Dealer must stand on all 17
        </div>
        <div className="text-center text-white/40 text-xs tracking-wider">
          Insurance pays 2 to 1
        </div>

        {/* Chip selector - between dealer and betting spots during betting */}
        {isBetting && (
          <div className="flex justify-center gap-4 py-4">
            {CHIP_VALUES.map((value) => {
              const isSelected = selectedChip === value
              const canAffordChip = bankroll >= value
              return (
                <button
                  key={value}
                  onClick={() => onSelectChip(value)}
                  disabled={!canAffordChip}
                  className={twMerge(
                    'w-14 h-14 rounded-full border-4 border-dashed bg-gradient-to-br text-white font-bold text-sm transition-all shadow-lg',
                    chipColors[value].bg,
                    isSelected && 'scale-125 ring-4 ring-yellow-400 ring-offset-2 ring-offset-emerald-800',
                    canAffordChip ? 'hover:scale-110 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {value >= 1000 ? `$${value / 1000}k` : `$${value}`}
                </button>
              )
            })}
          </div>
        )}

        {/* Player hands area - always visible to prevent layout jump */}
        <div className="h-44 flex justify-center items-end gap-4 my-6">
          {[...spots].reverse().map((spot) => {
            const index = spot.id
            const isActiveSpot = isPlaying && index === activeSpotIndex
            const hasHands = spot.bet > 0 && spot.hands.length > 0

            return (
              <div
                key={spot.id}
                className={twMerge(
                  'flex flex-col items-center justify-end transition-all h-full',
                  isActiveSpot && 'scale-105'
                )}
                style={{ minWidth: '120px' }}
              >
                {hasHands && (
                  <div className="flex flex-col items-center">
                    <div className={twMerge('flex gap-2', spot.hands.length > 1 && 'flex-row')}>
                      {spot.hands.map((hand, handIndex) => {
                        const isActiveHand = isActiveSpot && handIndex === spot.activeHandIndex
                        return (
                          <div key={handIndex} className={twMerge(isActiveHand && 'ring-2 ring-yellow-400 rounded-xl p-1')}>
                            <Hand
                              hand={hand}
                              isActive={isActiveHand}
                              label={spot.hands.length > 1 ? `H${handIndex + 1}` : undefined}
                              compact
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-xs text-white/60 mt-1">Spot {index + 1}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Betting spots - straight line at bottom */}
        <div className="relative mb-8">
          <div className="flex items-end justify-center gap-4">
            {[...spots].reverse().map((spot) => {
              const index = spot.id
              const isActive = isPlaying && index === activeSpotIndex && spot.bet > 0
              const hasBet = spot.bet > 0

              return (
                <div
                  key={spot.id}
                  className="flex flex-col items-center"
                  style={{ minWidth: '120px' }}
                >
                  {/* Side bet circles - only clickable if main bet exists */}
                  <div className="flex gap-2 mb-2">
                    {/* 21+3 circle */}
                    <BettingCircle
                      label="21+3"
                      amount={spot.sideBets.twentyOnePlusThree}
                      size="sm"
                      result={spot.sideBetResults.twentyOnePlusThree}
                      betType="twentyOnePlusThree"
                      isClickable={isBetting && canAfford && hasBet}
                      isLocked={isBetting && !hasBet}
                      onClick={() => onPlaceBet(index, 'twentyOnePlusThree')}
                    />
                    {/* Perfect Pairs circle */}
                    <BettingCircle
                      label="PP"
                      amount={spot.sideBets.perfectPairs}
                      size="sm"
                      result={spot.sideBetResults.perfectPairs}
                      betType="perfectPairs"
                      isClickable={isBetting && canAfford && hasBet}
                      isLocked={isBetting && !hasBet}
                      onClick={() => onPlaceBet(index, 'perfectPairs')}
                    />
                  </div>

                  {/* Main betting circle */}
                  {(() => {
                    const mainBetWin = calculateMainBetWin(spot)
                    const hasResult = spot.hands.some(h => h.isSettled && h.result)
                    return (
                      <div className="relative">
                        <button
                          onClick={() => isBetting && canAfford && onPlaceBet(index, 'main')}
                          disabled={!isBetting || !canAfford}
                          className={twMerge(
                            'relative w-20 h-20 rounded-full border-4 transition-all flex flex-col items-center justify-center',
                            isActive ? 'border-green-400 bg-green-400/20 animate-pulse' : 'border-white/30 bg-black/20',
                            hasResult && mainBetWin > 0 && 'ring-2 ring-green-400',
                            hasResult && mainBetWin < 0 && 'ring-2 ring-red-400',
                            isBetting && canAfford && 'hover:border-yellow-400 hover:bg-yellow-400/10 cursor-pointer hover:scale-105',
                            (!isBetting || !canAfford) && 'cursor-default'
                          )}
                        >
                          {/* Spot number */}
                          <span className="absolute -top-6 text-xs text-white/50">{index + 1}</span>

                          {hasBet ? (
                            <ChipStack amount={spot.hands.length > 0 ? spot.hands.reduce((sum, h) => sum + h.bet, 0) : spot.bet} />
                          ) : (
                            <span className="text-white/40 text-xs">BET</span>
                          )}
                          {/* Doubled indicator */}
                          {spot.hands.some(h => h.isDoubled) && (
                            <span className="absolute -right-2 -top-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                              2x
                            </span>
                          )}
                        </button>
                        {/* Win/Loss amount display */}
                        {hasResult && mainBetWin !== 0 && (
                          <div className={twMerge(
                            'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold px-2 py-0.5 rounded animate-pop whitespace-nowrap z-10',
                            mainBetWin > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          )}>
                            {mainBetWin > 0 ? '+' : ''}${mainBetWin}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {/* Insurance indicator */}
          {insuranceBet > 0 && (
            <div className="flex justify-center mt-3">
              <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                INSURED ${insuranceBet}
              </span>
            </div>
          )}
        </div>

        {/* Controls area at bottom of table */}
        <div className="bg-black/30 py-4">
          {/* Betting controls */}
          {(isBetting || isSettlement) && (
            <div className="flex items-center justify-center gap-8">
              {/* Bankroll stats on left */}
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm font-semibold">
                {totalBets > 0 && (
                  <>
                    <span className="text-yellow-400 text-left">Total Bets:</span>
                    <span className="text-yellow-400 text-right">${totalBets}</span>
                  </>
                )}
                {lastWinAmount > 0 && (
                  <>
                    <span className="text-yellow-400 text-left">Last Win:</span>
                    <span className="text-yellow-400 text-right">${lastWinAmount}</span>
                  </>
                )}
                <span className={twMerge('text-left', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>P/L:</span>
                <span className={twMerge('text-right', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>{lastWin > 0 ? '+' : ''}${lastWin}</span>
                <span className="text-green-400 text-left">Bankroll:</span>
                <span className="text-green-400 text-right">${bankroll}</span>
              </div>

              {/* Betting buttons */}
              <div className="flex justify-center gap-3">
                <button
                  className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-white/20 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={onClear}
                  disabled={isSettlement ? false : totalBets === 0}
                >
                  Clear
                </button>
                {isBetting && (
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-yellow-600 text-white hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={onDoubleBet}
                    disabled={!canDoubleBet}
                  >
                    2x
                  </button>
                )}
                <button
                  className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={onRebet}
                  disabled={!canRebet}
                >
                  Rebet {previousBetsTotal > 0 && <span className="text-blue-200">${previousBetsTotal}</span>}
                </button>
                <button
                  className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-400/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                  onClick={onDeal}
                  disabled={isSettlement ? !canRebet : !canDeal}
                >
                  Deal
                </button>
              </div>
            </div>
          )}

          {/* Even money controls */}
          {isEvenMoney && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              {/* Bankroll stats on left */}
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm font-semibold">
                <span className="text-green-400 text-left">Bankroll:</span>
                <span className="text-green-400 text-right">${bankroll}</span>
                {lastWinAmount > 0 && (
                  <>
                    <span className="text-yellow-400 text-left">Last Win:</span>
                    <span className="text-yellow-400 text-right">${lastWinAmount}</span>
                  </>
                )}
                <span className={twMerge('text-left', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>P/L:</span>
                <span className={twMerge('text-right', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>{lastWin > 0 ? '+' : ''}${lastWin}</span>
              </div>

              <div className="text-center">
                <p className="text-lg mb-2">You have Blackjack! Take even money?</p>
                <p className="text-yellow-400 mb-4">Guarantees 1:1 payout instead of risking a push</p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-gradient-to-br from-green-400 to-emerald-500 text-slate-900 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/40"
                    onClick={onTakeEvenMoney}
                  >
                    Take Even Money
                  </button>
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-white/20 text-white hover:bg-white/30"
                    onClick={onDeclineEvenMoney}
                  >
                    No, Risk It
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Insurance controls */}
          {isInsurance && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              {/* Bankroll stats on left */}
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm font-semibold">
                <span className="text-green-400 text-left">Bankroll:</span>
                <span className="text-green-400 text-right">${bankroll}</span>
                {lastWinAmount > 0 && (
                  <>
                    <span className="text-yellow-400 text-left">Last Win:</span>
                    <span className="text-yellow-400 text-right">${lastWinAmount}</span>
                  </>
                )}
                <span className={twMerge('text-left', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>P/L:</span>
                <span className={twMerge('text-right', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>{lastWin > 0 ? '+' : ''}${lastWin}</span>
              </div>

              <div className="text-center">
                <p className="text-lg mb-2">Dealer shows an Ace. Insurance?</p>
                <p className="text-yellow-400 mb-4">Cost: ${insuranceCost}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-400/40 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={onTakeInsurance}
                    disabled={!canAffordInsurance}
                  >
                    Take Insurance
                  </button>
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-white/20 text-white hover:bg-white/30"
                    onClick={onDeclineInsurance}
                  >
                    No Insurance
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Player turn controls */}
          {isPlayerTurn && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              {/* Bankroll stats on left */}
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm font-semibold">
                <span className="text-green-400 text-left">Bankroll:</span>
                <span className="text-green-400 text-right">${bankroll}</span>
                {lastWinAmount > 0 && (
                  <>
                    <span className="text-yellow-400 text-left">Last Win:</span>
                    <span className="text-yellow-400 text-right">${lastWinAmount}</span>
                  </>
                )}
                <span className={twMerge('text-left', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>P/L:</span>
                <span className={twMerge('text-right', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>{lastWin > 0 ? '+' : ''}${lastWin}</span>
              </div>

              {/* Action buttons or hit confirmation */}
              {showHitConfirm ? (
                <div className="flex flex-col items-center gap-3 animate-pop">
                  <div className="text-yellow-400 font-bold text-lg">
                    Are you sure you want to hit?
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-red-600 text-white hover:bg-red-500"
                      onClick={onConfirmHit}
                    >
                      Yes, Hit
                    </button>
                    <button
                      className="min-w-24 px-6 py-3 text-base font-bold border-none rounded-lg cursor-pointer transition-all bg-green-600 text-white hover:bg-green-500"
                      onClick={() => { onCancelHit(); onStand(); }}
                    >
                      No, Stand
                    </button>
                  </div>
                </div>
              ) : (
                <ActionButtons
                  canHit={canHit}
                  canStand={canStand}
                  canDouble={canDouble}
                  canSplit={canSplit}
                  canSurrender={canSurrender}
                  onHit={onHit}
                  onStand={onStand}
                  onDouble={onDouble}
                  onSplit={onSplit}
                  onSurrender={onSurrender}
                />
              )}
            </div>
          )}

          {/* Dealer turn */}
          {isDealerTurn && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              {/* Bankroll stats on left */}
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm font-semibold">
                <span className="text-green-400 text-left">Bankroll:</span>
                <span className="text-green-400 text-right">${bankroll}</span>
                {lastWinAmount > 0 && (
                  <>
                    <span className="text-yellow-400 text-left">Last Win:</span>
                    <span className="text-yellow-400 text-right">${lastWinAmount}</span>
                  </>
                )}
                <span className={twMerge('text-left', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>P/L:</span>
                <span className={twMerge('text-right', lastWin > 0 ? 'text-green-400' : lastWin < 0 ? 'text-red-400' : 'text-white/70')}>{lastWin > 0 ? '+' : ''}${lastWin}</span>
              </div>

              <div className="text-xl text-white/80 animate-pulse-subtle">
                Dealer is playing...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bust overlay */}
      {isBust && (
        <div className="absolute inset-0 bg-black/80 rounded-t-[200px] flex items-center justify-center z-50">
          <div className="text-center animate-pop">
            <div className="text-6xl font-bold text-red-500 mb-4">BUST!</div>
            <div className="text-xl text-white/80 mb-8">You've run out of chips</div>
            <button
              onClick={onRestart}
              className="px-8 py-4 text-xl font-bold rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-400/40 transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Chip stack visualization
function ChipStack({ amount }: { amount: number }) {
  // Determine chip color based on amount
  let chipColor = chipColors[5]
  if (amount >= 1000) chipColor = chipColors[1000]
  else if (amount >= 500) chipColor = chipColors[500]
  else if (amount >= 100) chipColor = chipColors[100]
  else if (amount >= 25) chipColor = chipColors[25]

  return (
    <div className="relative">
      <div className={twMerge(
        'w-12 h-12 rounded-full bg-gradient-to-br border-4 border-dashed flex items-center justify-center shadow-lg',
        chipColor.bg,
        chipColor.border
      )}>
        <span className="text-white font-bold text-xs">${amount}</span>
      </div>
    </div>
  )
}

// Calculate win amount for side bets
function calculateSideBetWin(
  betType: 'twentyOnePlusThree' | 'perfectPairs',
  amount: number,
  result: TwentyOnePlusThreeResult | PerfectPairsResult
): number {
  if (!result || amount === 0) return 0

  if (betType === 'twentyOnePlusThree' && result in SIDE_BET_PAYOUTS.twentyOnePlusThree) {
    return amount * SIDE_BET_PAYOUTS.twentyOnePlusThree[result as keyof typeof SIDE_BET_PAYOUTS.twentyOnePlusThree]
  }
  if (betType === 'perfectPairs' && result in SIDE_BET_PAYOUTS.perfectPairs) {
    return amount * SIDE_BET_PAYOUTS.perfectPairs[result as keyof typeof SIDE_BET_PAYOUTS.perfectPairs]
  }
  return 0
}

// Calculate win amount for main bet (all hands in a spot)
function calculateMainBetWin(spot: Spot): number {
  if (spot.bet === 0 || spot.hands.length === 0) return 0

  let totalWin = 0
  for (const hand of spot.hands) {
    if (!hand.isSettled || !hand.result) continue

    switch (hand.result) {
      case 'blackjack':
        totalWin += hand.bet * 1.5 // Profit is 1.5x bet (pays 3:2)
        break
      case 'win':
        totalWin += hand.bet // Profit is 1x bet (pays 1:1)
        break
      case 'push':
        // No profit, bet returned
        break
      case 'lose':
        totalWin -= hand.bet // Lost the bet
        break
      case 'surrender':
        totalWin -= hand.bet / 2 // Lost half the bet
        break
    }
  }

  return totalWin
}

// Betting circle component for side bets
function BettingCircle({
  label,
  amount,
  size = 'md',
  result,
  betType,
  isClickable,
  isLocked,
  onClick,
}: {
  label: string
  amount: number
  size?: 'sm' | 'md'
  result?: TwentyOnePlusThreeResult | PerfectPairsResult
  betType?: 'twentyOnePlusThree' | 'perfectPairs'
  isClickable?: boolean
  isLocked?: boolean
  onClick?: () => void
}) {
  const sizeClasses = size === 'sm' ? 'w-11 h-11 text-[9px]' : 'w-14 h-14 text-xs'
  const hasWin = result !== null && result !== undefined

  // Calculate win amount
  const winAmount = betType && result ? calculateSideBetWin(betType, amount, result) : 0

  // Determine chip color for display
  let chipColor = chipColors[5]
  if (amount >= 1000) chipColor = chipColors[1000]
  else if (amount >= 500) chipColor = chipColors[500]
  else if (amount >= 100) chipColor = chipColors[100]
  else if (amount >= 25) chipColor = chipColors[25]

  return (
    <div className="relative">
      {/* Win amount display */}
      {hasWin && winAmount > 0 && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pop whitespace-nowrap z-10">
          +${winAmount}
        </div>
      )}
      <button
        onClick={onClick}
        disabled={!isClickable}
        className={twMerge(
          sizeClasses,
          'rounded-full border-2 transition-all flex flex-col items-center justify-center',
          amount > 0 ? ['bg-linear-to-br border-dashed', chipColor.bg, chipColor.border] : 'border-white/20 bg-black/30',
          hasWin && 'ring-2 ring-green-400',
          isClickable ? 'hover:border-yellow-400 hover:bg-yellow-400/10 cursor-pointer hover:scale-110' : 'cursor-default',
          isLocked && amount === 0 && 'opacity-40'
        )}
      >
        {amount > 0
          ? <span className="text-white font-bold text-[10px]">${amount}</span>
          : <span className="text-white/50 leading-none">{label}</span>
        }
      </button>
    </div>
  )
}
