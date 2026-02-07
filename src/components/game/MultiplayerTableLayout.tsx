import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Hand as HandComponent } from '../Hand'
import { ActionButtons } from '../ActionButtons'
import { TurnTimer } from './TurnTimer'
import { PlayerNameplate } from './PlayerNameplate'
import type { BroadcastGameState, BroadcastSpot, BroadcastCard } from '../../hooks/useMultiplayerGame'
import type { Card, ChipValue, Hand } from '../../game/types'
import { CHIP_VALUES } from '../../game/types'

const chipColors: Record<ChipValue, { bg: string; border: string }> = {
  5: { bg: 'from-red-500 to-red-700', border: 'border-red-400' },
  25: { bg: 'from-green-500 to-green-700', border: 'border-green-400' },
  100: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-400' },
  500: { bg: 'from-purple-500 to-purple-700', border: 'border-purple-400' },
  1000: { bg: 'from-orange-500 to-orange-700', border: 'border-orange-400' },
}

// Convert broadcast card to full Card type for Hand component
function toCard(bc: BroadcastCard): Card {
  if (bc.faceUp && bc.suit && bc.rank) {
    return { suit: bc.suit as Card['suit'], rank: bc.rank as Card['rank'], faceUp: true }
  }
  return { suit: 'spades', rank: 'A', faceUp: false }
}

// Convert broadcast hand to Hand type
function toHand(bh: { cards: BroadcastCard[]; bet: number; isDoubled: boolean; isSplit: boolean; result?: string }): Hand {
  return {
    cards: bh.cards.map(toCard),
    bet: bh.bet,
    isDoubled: bh.isDoubled,
    isSplit: bh.isSplit,
    isSplitAces: false,
    isSettled: !!bh.result,
    result: bh.result as Hand['result'],
  }
}

interface MultiplayerTableLayoutProps {
  gameState: BroadcastGameState
  userId: string
  bankroll: number
  turnTimer: number | null
  bettingTimer: number | null
  onAction: (type: string, amount?: number) => void
}

export function MultiplayerTableLayout({
  gameState,
  userId,
  bankroll,
  turnTimer,
  bettingTimer,
  onAction,
}: MultiplayerTableLayoutProps) {
  const { phase, spots, activeSpotIndex, dealerHand, message } = gameState

  const [selectedChip, setSelectedChip] = useState<ChipValue>(25)

  const isBetting = phase === 'betting'
  const isPlayerTurn = phase === 'playerTurn'
  const isSettlement = phase === 'settlement'
  const isDealerTurn = phase === 'dealerTurn'
  const isEvenMoney = phase === 'evenMoney'
  const isInsurance = phase === 'insurance'
  const isPlaying = isPlayerTurn || isDealerTurn || isInsurance || isEvenMoney
  const showDealerValue = isDealerTurn || isSettlement

  const mySpot = spots.find((s) => s.playerId === userId)
  const activeSpot = spots[activeSpotIndex]
  const isMyTurn = isPlayerTurn && activeSpot?.playerId === userId

  // Can actions
  const myHand = mySpot?.hands[mySpot.activeHandIndex]
  const canHit = isMyTurn && !!myHand && myHand.cards.length > 0
  const canDouble = isMyTurn && !!myHand && myHand.cards.length === 2 && !myHand.isSplit && bankroll >= myHand.bet
  const canSplitCards = isMyTurn && !!myHand && myHand.cards.length === 2 && mySpot!.hands.length < 4 && bankroll >= myHand.bet && (
    myHand.cards[0].faceUp && myHand.cards[1].faceUp &&
    toCard(myHand.cards[0]).rank === toCard(myHand.cards[1]).rank
  )
  const canSurrender = isMyTurn && !!myHand && myHand.cards.length === 2 && !myHand.isSplit && mySpot!.activeHandIndex === 0

  const hasBet = mySpot ? mySpot.bet > 0 : false

  return (
    <div className="relative w-full">
      <div
        className={twMerge(
          'flex flex-col',
          'relative bg-linear-to-b from-emerald-700 to-emerald-800 rounded-t-[200px]',
          'border-8 border-amber-900 shadow-2xl overflow-hidden min-h-125'
        )}
      >
        {/* Dealer area */}
        <div className="pt-4 pb-4 flex flex-col items-center">
          {dealerHand.length > 0 ? (
            <HandComponent
              cards={dealerHand.map(toCard)}
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

        {/* Shoe info */}
        <div className="text-center text-white/30 text-xs">
          Round {gameState.roundNumber} &middot; {gameState.shoeSize} cards
        </div>

        {/* Chip selector during betting */}
        {isBetting && mySpot && !hasBet && (
          <div className="flex justify-center gap-4 py-4">
            {CHIP_VALUES.map((value) => {
              const isSelected = selectedChip === value
              const canAffordChip = bankroll >= value
              return (
                <button
                  key={value}
                  onClick={() => setSelectedChip(value)}
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

        {/* Player hands area */}
        <div className="h-44 flex justify-center items-end gap-4 my-6">
          {[...spots].reverse().map((spot) => {
            const isActiveSpot = isPlaying && spot.id === activeSpotIndex
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
                            <HandComponent
                              hand={toHand(hand)}
                              isActive={isActiveHand}
                              label={spot.hands.length > 1 ? `H${handIndex + 1}` : undefined}
                              compact
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Betting spots with nameplates */}
        <div className="relative mb-8">
          <div className="flex items-end justify-center gap-4">
            {[...spots].reverse().map((spot) => {
              const isActive = isPlaying && spot.id === activeSpotIndex && spot.bet > 0
              const isMe = spot.playerId === userId
              const mainBetWin = calculateMainBetWin(spot)
              const hasResult = spot.hands.some(h => h.result)

              return (
                <div key={spot.id} className="flex flex-col items-center" style={{ minWidth: '120px' }}>
                  {/* Player nameplate */}
                  {spot.playerName && (
                    <div className="mb-2">
                      <PlayerNameplate
                        name={spot.playerName}
                        isActive={isActive}
                        isCurrentUser={isMe}
                      />
                    </div>
                  )}

                  {/* Betting circle */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (isBetting && isMe && !hasBet && bankroll >= selectedChip) {
                          onAction('PLACE_BET', selectedChip)
                        }
                      }}
                      disabled={!isBetting || !isMe || hasBet || bankroll < selectedChip}
                      className={twMerge(
                        'relative w-20 h-20 rounded-full border-4 transition-all flex flex-col items-center justify-center',
                        isActive ? 'border-green-400 bg-green-400/20 animate-pulse' : 'border-white/30 bg-black/20',
                        hasResult && mainBetWin > 0 && 'ring-2 ring-green-400',
                        hasResult && mainBetWin < 0 && 'ring-2 ring-red-400',
                        isBetting && isMe && !hasBet && 'hover:border-yellow-400 hover:bg-yellow-400/10 cursor-pointer hover:scale-105',
                        (!isBetting || !isMe || hasBet) && 'cursor-default'
                      )}
                    >
                      <span className="absolute -top-6 text-xs text-white/50">{spot.id + 1}</span>
                      {spot.bet > 0 ? (
                        <ChipStack amount={spot.hands.length > 0 ? spot.hands.reduce((sum, h) => sum + h.bet, 0) : spot.bet} />
                      ) : (
                        <span className="text-white/40 text-xs">{spot.playerId ? 'BET' : ''}</span>
                      )}
                    </button>
                    {hasResult && mainBetWin !== 0 && (
                      <div className={twMerge(
                        'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold px-2 py-0.5 rounded animate-pop whitespace-nowrap z-10',
                        mainBetWin > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      )}>
                        {mainBetWin > 0 ? '+' : ''}${mainBetWin}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Controls area */}
        <div className="bg-black/30 py-4">
          {/* Betting phase */}
          {isBetting && (
            <div className="flex items-center justify-center gap-8">
              <div className="text-sm text-white/60">
                <div>Bankroll: <span className="text-green-400 font-bold">${bankroll}</span></div>
                {hasBet && <div className="text-yellow-400 mt-1">Bet placed! Waiting for others...</div>}
              </div>
              {bettingTimer !== null && <TurnTimer seconds={bettingTimer} label="Betting" />}
            </div>
          )}

          {/* Even money */}
          {isEvenMoney && mySpot && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              <div className="text-center">
                <p className="text-lg mb-2">Even money?</p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 text-slate-900 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                    onClick={() => onAction('TAKE_EVEN_MONEY')}
                  >
                    Take Even Money
                  </button>
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    onClick={() => onAction('DECLINE_EVEN_MONEY')}
                  >
                    Decline
                  </button>
                </div>
              </div>
              {turnTimer !== null && <TurnTimer seconds={turnTimer} />}
            </div>
          )}

          {/* Insurance */}
          {isInsurance && mySpot && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              <div className="text-center">
                <p className="text-lg mb-2">Dealer shows Ace. Insurance?</p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                    onClick={() => onAction('TAKE_INSURANCE')}
                  >
                    Take Insurance
                  </button>
                  <button
                    className="min-w-24 px-6 py-3 text-base font-bold rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    onClick={() => onAction('DECLINE_INSURANCE')}
                  >
                    No Insurance
                  </button>
                </div>
              </div>
              {turnTimer !== null && <TurnTimer seconds={turnTimer} />}
            </div>
          )}

          {/* Player turn */}
          {isPlayerTurn && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              <div className="text-sm text-white/60">
                <div>Bankroll: <span className="text-green-400 font-bold">${bankroll}</span></div>
              </div>
              {isMyTurn ? (
                <ActionButtons
                  canHit={canHit}
                  canStand={true}
                  canDouble={canDouble}
                  canSplit={canSplitCards}
                  canSurrender={canSurrender}
                  onHit={() => onAction('HIT')}
                  onStand={() => onAction('STAND')}
                  onDouble={() => onAction('DOUBLE')}
                  onSplit={() => onAction('SPLIT')}
                  onSurrender={() => onAction('SURRENDER')}
                />
              ) : (
                <div className="text-white/60">
                  Waiting for{' '}
                  <span className="text-yellow-400 font-bold">
                    {activeSpot?.playerName ?? 'player'}
                  </span>
                  ...
                </div>
              )}
              {turnTimer !== null && <TurnTimer seconds={turnTimer} />}
            </div>
          )}

          {/* Dealer turn */}
          {isDealerTurn && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              <div className="text-sm text-white/60">
                Bankroll: <span className="text-green-400 font-bold">${bankroll}</span>
              </div>
              <div className="text-xl text-white/80 animate-pulse-subtle">
                Dealer is playing...
              </div>
            </div>
          )}

          {/* Settlement */}
          {isSettlement && (
            <div className="flex items-center justify-center gap-8 animate-state-enter">
              <div className="text-sm text-white/60">
                Bankroll: <span className="text-green-400 font-bold">${bankroll}</span>
              </div>
              <div className="text-lg text-white/80">{message}</div>
              <div className="text-sm text-white/40">Next round starting soon...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChipStack({ amount }: { amount: number }) {
  let chipColor = chipColors[5]
  if (amount >= 1000) chipColor = chipColors[1000]
  else if (amount >= 500) chipColor = chipColors[500]
  else if (amount >= 100) chipColor = chipColors[100]
  else if (amount >= 25) chipColor = chipColors[25]

  return (
    <div className={twMerge(
      'w-12 h-12 rounded-full bg-gradient-to-br border-4 border-dashed flex items-center justify-center shadow-lg',
      chipColor.bg,
      chipColor.border
    )}>
      <span className="text-white font-bold text-xs">${amount}</span>
    </div>
  )
}

function calculateMainBetWin(spot: BroadcastSpot): number {
  if (spot.bet === 0 || spot.hands.length === 0) return 0
  let totalWin = 0
  for (const hand of spot.hands) {
    if (!hand.result) continue
    switch (hand.result) {
      case 'blackjack': totalWin += hand.bet * 1.5; break
      case 'win': totalWin += hand.bet; break
      case 'push': break
      case 'lose': totalWin -= hand.bet; break
      case 'surrender': totalWin -= hand.bet / 2; break
    }
  }
  return totalWin
}
