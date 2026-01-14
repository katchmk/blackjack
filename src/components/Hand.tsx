import { useRef, useLayoutEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import type { Hand as HandType, Card as CardType } from '../game/types'
import { Card } from './Card'
import { getHandDisplayValue } from '../game/scoring'

interface HandProps {
  hand?: HandType
  cards?: CardType[]
  isActive?: boolean
  label?: string
  hideValue?: boolean
  compact?: boolean
}

const resultColors: Record<string, string> = {
  blackjack: 'text-yellow-400 animate-blackjack',
  win: 'text-green-500 animate-win',
  lose: 'text-red-500',
  push: 'text-orange-400',
  surrender: 'text-gray-400',
}

const resultText: Record<string, string> = {
  blackjack: ' Blackjack!',
  win: ' Win',
  lose: ' Lose',
  push: ' Push',
  surrender: ' Surrender',
}

export function Hand({ hand, cards, isActive, label, hideValue, compact }: HandProps) {
  const displayCards = hand?.cards ?? cards ?? []
  const displayValue = getHandDisplayValue(displayCards)
  const showValue = !hideValue && displayCards.length > 0

  // Track which cards have been rendered using a Set of card keys
  const renderedCardsRef = useRef(new Set<string>())

  // Determine which cards should animate (not yet in the rendered set)
  const cardAnimationState = displayCards.map((card, index) => {
    const cardKey = `${card.suit}-${card.rank}-${index}`
    return !renderedCardsRef.current.has(cardKey)
  })

  // Update the rendered set after layout but before paint
  useLayoutEffect(() => {
    displayCards.forEach((card, index) => {
      const cardKey = `${card.suit}-${card.rank}-${index}`
      renderedCardsRef.current.add(cardKey)
    })
  })

  // Diagonal stacking offsets
  const xOffset = compact ? 18 : 25
  const yOffset = compact ? 12 : 18
  const valueTextSize = compact ? 'text-lg' : 'text-2xl'
  const labelTextSize = compact ? 'text-xs' : 'text-sm'

  // Calculate container size based on number of cards
  const cardWidth = compact ? 72 : 96  // w-18 or w-24
  const cardHeight = compact ? 108 : 144 // h-27 or h-36
  const containerWidth = cardWidth + (displayCards.length - 1) * xOffset
  const containerHeight = cardHeight + (displayCards.length - 1) * yOffset

  return (
    <div className={twMerge(
      'flex flex-col items-center gap-4 rounded-xl transition-all duration-300',
      compact ? 'p-1' : 'p-2.5',
      isActive && 'bg-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
    )}>
      {label && (
        <div className={twMerge(labelTextSize, 'text-white/80 uppercase tracking-wider')}>{label}</div>
      )}
      <div
        className={twMerge('relative', compact && 'scale-75 origin-center')}
        style={{ width: containerWidth, height: containerHeight }}
      >
        {displayCards.map((card, index) => (
          <div
            key={`${card.suit}-${card.rank}-${index}`}
            className="absolute"
            style={{
              left: index * xOffset,
              top: index * yOffset,
            }}
          >
            <Card
              card={card}
              index={index}
              animate={cardAnimationState[index]}
            />
          </div>
        ))}
      </div>
      {showValue && (
        <div className={twMerge(
          valueTextSize,
          'font-bold text-white drop-shadow',
          hand?.result === 'blackjack' && 'animate-blackjack',
          hand?.result === 'win' && 'animate-win'
        )}>
          {displayValue}
          {hand?.result && (
            <span className={twMerge('ml-2', compact ? 'text-xs' : 'text-base', resultColors[hand.result])}>
              {resultText[hand.result] || ''}
            </span>
          )}
        </div>
      )}
      {!compact && hand && hand.bet > 0 && (
        <div className="text-sm text-yellow-400">Bet: ${hand.bet}</div>
      )}
    </div>
  )
}
