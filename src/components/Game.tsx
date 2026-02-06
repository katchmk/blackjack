import { GameContext } from '../game/context'
import { TableLayout } from './TableLayout'

export function Game() {
  return (
    <GameContext.Provider>
      <div className="w-full max-w-5xl">
        <TableLayout />
      </div>
    </GameContext.Provider>
  )
}
