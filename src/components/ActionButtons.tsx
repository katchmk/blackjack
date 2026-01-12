interface ActionButtonsProps {
  canHit: boolean
  canStand: boolean
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  onSurrender: () => void
}

export function ActionButtons({
  canHit,
  canStand,
  canDouble,
  canSplit,
  canSurrender,
  onHit,
  onStand,
  onDouble,
  onSplit,
  onSurrender,
}: ActionButtonsProps) {
  const baseBtn = "px-6 py-4 text-lg font-bold border-none rounded-lg cursor-pointer transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
  const actionBtn = `${baseBtn} bg-gradient-to-br from-blue-500 to-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/40`
  const surrenderBtn = `${baseBtn} bg-gradient-to-br from-red-500 to-red-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/40`

  return (
    <div className="flex gap-2.5 flex-wrap justify-center">
      <button className={actionBtn} onClick={onHit} disabled={!canHit}>
        Hit
      </button>
      <button className={actionBtn} onClick={onStand} disabled={!canStand}>
        Stand
      </button>
      <button className={actionBtn} onClick={onDouble} disabled={!canDouble}>
        Double
      </button>
      <button className={actionBtn} onClick={onSplit} disabled={!canSplit}>
        Split
      </button>
      <button className={surrenderBtn} onClick={onSurrender} disabled={!canSurrender}>
        Surrender
      </button>
    </div>
  )
}
