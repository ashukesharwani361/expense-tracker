import { CATEGORIES, formatCurrency } from '../lib/format'

export default function CategoryBars({ totals, maxTotal }) {
  const rows = CATEGORIES.map((category) => ({
    ...category,
    amount: totals[category.id] || 0,
  })).filter((row) => row.amount > 0)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No spending in this month yet. Add an expense to see the breakdown.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {rows
        .sort((a, b) => b.amount - a.amount)
        .map((row) => {
          const width = maxTotal > 0 ? Math.round((row.amount / maxTotal) * 100) : 0
          return (
            <li key={row.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{row.label}</span>
                <span className="text-slate-400">{formatCurrency(row.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          )
        })}
    </ul>
  )
}
