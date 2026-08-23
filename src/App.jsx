import { useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import CategoryBars from './components/CategoryBars'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import SummaryCards from './components/SummaryCards'
import { useExpenses } from './hooks/useExpenses'
import {
  CATEGORIES,
  currentMonthValue,
  monthLabel,
} from './lib/format'

export default function App() {
  const {
    expenses,
    monthlyBudget,
    addExpense,
    updateExpense,
    deleteExpense,
    setMonthlyBudget,
  } = useExpenses()

  const [month, setMonth] = useState(currentMonthValue)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget || ''))

  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      const inMonth = expense.date.startsWith(month)
      const inCategory =
        categoryFilter === 'all' || expense.category === categoryFilter
      const matchesQuery = expense.title
        .toLowerCase()
        .includes(query.trim().toLowerCase())
      return inMonth && inCategory && matchesQuery
    })
  }, [expenses, month, categoryFilter, query])

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(month)),
    [expenses, month],
  )

  const total = monthExpenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const remaining = monthlyBudget - total
  const categoryTotals = monthExpenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount)
    return acc
  }, {})
  const maxCategory = Math.max(0, ...Object.values(categoryTotals))

  const handleSubmit = (payload) => {
    if (editing) {
      updateExpense(editing.id, payload)
      setEditing(null)
    } else {
      addExpense(payload)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Expense Tracker</h1>
            <p className="text-sm text-slate-400">{monthLabel(month)}</p>
          </div>
        </div>
        <label className="text-sm">
          <span className="sr-only">Select month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
          />
        </label>
      </header>

      <SummaryCards
        total={total}
        count={monthExpenses.length}
        budget={monthlyBudget}
        remaining={remaining}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? 'Edit expense' : 'Add expense'}
          </h2>
          <ExpenseForm
            editing={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold">Category breakdown</h2>
          <CategoryBars totals={categoryTotals} maxTotal={maxCategory} />
          <form
            className="mt-6 border-t border-white/10 pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              setMonthlyBudget(budgetInput)
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Monthly budget (₹)</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                />
                <button
                  type="submit"
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                >
                  Save
                </button>
              </div>
            </label>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Expenses</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:ring-2"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:ring-2"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ExpenseList
          expenses={filtered}
          onEdit={setEditing}
          onDelete={deleteExpense}
        />
      </section>
    </div>
  )
}
