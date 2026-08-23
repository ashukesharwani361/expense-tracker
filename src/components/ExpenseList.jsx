import { Pencil, Trash2 } from 'lucide-react'
import { CATEGORIES, formatCurrency, formatDate } from '../lib/format'

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
        No expenses match these filters.
      </p>
    )
  }

  const grouped = expenses.reduce((acc, expense) => {
    acc[expense.date] ??= []
    acc[expense.date].push(expense)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {dates.map((date) => (
        <section key={date}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatDate(date)}
          </h3>
          <ul className="space-y-2">
            {grouped[date].map((expense) => {
              const category = CATEGORIES.find((item) => item.id === expense.category)
              return (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{expense.title}</p>
                    <p className="text-xs text-slate-400">
                      {category?.label ?? 'Other'}
                      {expense.note ? ` · ${expense.note}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                    <button
                      type="button"
                      onClick={() => onEdit(expense)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                      aria-label="Edit expense"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(expense.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-300"
                      aria-label="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
