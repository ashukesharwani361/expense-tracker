import { CATEGORIES, formatCurrency } from '../lib/format'

export default function CategoryBars({ totals, maxTotal, totalMonthlySpend }) {
  const totalSpend = totalMonthlySpend ?? Object.values(totals).reduce((sum, v) => sum + Number(v || 0), 0)

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
          const percentOfTotal = totalSpend > 0 ? Math.round((row.amount / totalSpend) * 100) : 0
          return (
            <li key={row.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">({percentOfTotal}%)</span>
                  <span className="text-slate-300">{formatCurrency(row.amount)}</span>
                </div>
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
