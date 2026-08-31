import { formatCurrency, monthLabel } from '../lib/format'

export default function MonthlyTrend({ totals }) {
  if (totals.length === 0) {
    return <p className="text-sm text-slate-400">Add transactions to see monthly totals.</p>
  }

  const maxValue = Math.max(1, ...totals.flatMap((item) => [item.income, item.expense]))

  return (
    <div className="space-y-4">
      {totals.map((item) => (
        <div key={item.month}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{monthLabel(item.month)}</span>
            <span className={item.balance >= 0 ? 'text-emerald-300' : 'text-red-300'}>
              {formatCurrency(item.balance)} net
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-14">Income</span>
              <div className="h-2 flex-1 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(item.income / maxValue) * 100}%` }} />
              </div>
              <span className="w-20 text-right">{formatCurrency(item.income)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-14">Spent</span>
              <div className="h-2 flex-1 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-orange-400" style={{ width: `${(item.expense / maxValue) * 100}%` }} />
              </div>
              <span className="w-20 text-right">{formatCurrency(item.expense)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
