# Free Blackjack Game

A free, browser-based blackjack game with realistic gameplay. No download or registration required.

## Features

- **Classic Blackjack** - Hit, Stand, Double Down, Split, Surrender
- **Side Bets** - 21+3 and Perfect Pairs with full payout tables
- **Insurance & Even Money** - Full insurance options when dealer shows an Ace
- **Multi-Spot Play** - Play up to 7 spots simultaneously
- **Triple 7s Bonus** - Bonus payout for hitting three 7s
- **Realistic UI** - Card animations, chip stacks, and win/loss indicators

## Side Bet Payouts

### 21+3
| Hand | Payout |
|------|--------|
| Suited Triple | 100:1 |
| Straight Flush | 40:1 |
| Three of a Kind | 30:1 |
| Straight | 10:1 |
| Flush | 5:1 |

### Perfect Pairs
| Hand | Payout |
|------|--------|
| Perfect Pair | 25:1 |
| Colored Pair | 12:1 |
| Mixed Pair | 6:1 |

## Tech Stack

- **React 19** with React Compiler
- **TypeScript** with strict mode
- **XState** for state machine management
- **Vite** for development and building
- **Tailwind CSS** for styling

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint
```

## License

MIT
