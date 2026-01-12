import type { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
}

export function Table({ children }: TableProps) {
  return (
    <div className="bg-gradient-to-br from-green-800 to-green-700 rounded-2xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_0_60px_rgba(0,0,0,0.2)] border-8 border-amber-800">
      <div className="flex flex-col gap-8 min-h-[350px]">
        {children}
      </div>
    </div>
  )
}
