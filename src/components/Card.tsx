import { twMerge } from 'tailwind-merge'
import type { Card as CardType } from '../game/types'

const suitSymbols: Record<CardType['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

const suitColors: Record<CardType['suit'], string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
}

interface CardProps {
  card: CardType
  index?: number
  animate?: boolean
}

export function Card({ card, index = 0, animate = true }: CardProps) {
  const delay = `${index * 150}ms`

  if (!card.faceUp) {
    return (
      <div
        className={twMerge('card-container', animate && 'animate-deal')}
        style={animate ? { animationDelay: delay } : undefined}
      >
        <div className="w-24 h-36 bg-gradient-to-br from-blue-600 to-blue-900 rounded-lg shadow-lg flex items-center justify-center overflow-hidden">
          <div className="w-4/5 h-4/5 border-2 border-white/30 rounded card-pattern" />
        </div>
      </div>
    )
  }

  const symbol = suitSymbols[card.suit]
  const colorClass = suitColors[card.suit]

  return (
    <div
      className={twMerge('card-container', animate && 'animate-deal')}
      style={animate ? { animationDelay: delay } : undefined}
    >
      <div className={twMerge('w-24 h-36 bg-white rounded-lg shadow-lg relative flex items-center justify-center', colorClass)}>
        <div className="absolute top-1 left-2 flex flex-col items-center font-bold">
          <span className="text-lg leading-none">{card.rank}</span>
          <span className="text-base leading-none">{symbol}</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-5xl">{symbol}</span>
        </div>
        <div className="absolute bottom-1 right-2 flex flex-col items-center font-bold rotate-180">
          <span className="text-lg leading-none">{card.rank}</span>
          <span className="text-base leading-none">{symbol}</span>
        </div>
      </div>
    </div>
  )
}
