import { useState } from 'react'

interface CreateRoomDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, minBet: number) => Promise<void>
}

export function CreateRoomDialog({ open, onClose, onCreate }: CreateRoomDialogProps) {
  const [name, setName] = useState('')
  const [minBet, setMinBet] = useState(5)
  const [creating, setCreating] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await onCreate(name, minBet)
      onClose()
      setName('')
    } catch {
      // error handled upstream
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Create Room</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Room Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-yellow-400 focus:outline-none"
            required
            maxLength={30}
            autoFocus
          />
          <div>
            <label className="text-sm text-white/60 block mb-1">Minimum Bet</label>
            <select
              value={minBet}
              onChange={(e) => setMinBet(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
            >
              <option value={5}>$5</option>
              <option value={25}>$25</option>
              <option value={100}>$100</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 font-bold rounded-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
