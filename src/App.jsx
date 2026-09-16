import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Cloud,
  CreditCard,
  LogOut,
  PiggyBank,
  RefreshCcw,
  Search,
  Shield,
  Wallet,
} from 'lucide-react'
import CategoryBars from './components/CategoryBars'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import IncomeForm from './components/IncomeForm'
import MonthlyTrend from './components/MonthlyTrend'
import SummaryCards from './components/SummaryCards'
import { useExpenses } from './hooks/useExpenses'
import {
  CATEGORIES,
  PAYMENT_METHODS,
  currentMonthValue,
  monthLabel,
  todayIso,
} from './lib/format'

function AuthScreen({ onSubmit, isSignUp, setIsSignUp, error }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Finora</p>
            <h1 className="text-2xl font-semibold">Smart expense tracking</h1>
          </div>
        </div>

        <div className="mb-5 flex gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${!isSignUp ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${isSignUp ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
          >
            Create account
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(form)
          }}
        >
          {isSignUp ? (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Full name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                placeholder="Aarav Sharma"
                required
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
              placeholder="name@example.com"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-300"
          >
            {isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  )
}

function formatSyncTime(value) {
  if (!value) return 'Not synced yet'
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function App() {
  const {
    currentUser,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    expenses,
    monthlyBudgets,
    recurringExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    setMonthlyBudget,
    addRecurringExpense,
    updateRecurringExpense,
    removeRecurringExpense,
    syncNow,
    syncStatus,
    isExpensesLoading,
    expensesError,
    pendingAction,
    registerFormResetCallback,
  } = useExpenses()

  const [formResetKey, setFormResetKey] = useState(0)

  useEffect(() => {
    if (typeof registerFormResetCallback === 'function') {
      return registerFormResetCallback((action) => {
        if (action?.type === 'UPDATE_EXPENSE') {
          setEditing(null)
        }
        setFormResetKey((prev) => prev + 1)
      })
    }
  }, [registerFormResetCallback])

  const [month, setMonth] = useState(currentMonthValue)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [entryType, setEntryType] = useState('expense')
  const [authMode, setAuthMode] = useState('signin')
  const [authError, setAuthError] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [recurringForm, setRecurringForm] = useState({
    title: '',
    amount: '',
    category: 'food',
    paymentMethod: 'upi',
    cadence: 'monthly',
    nextDate: todayIso(),
    note: '',
  })

  const isBudgetSet = monthlyBudgets[month] !== undefined
  const monthlyBudget = Number(monthlyBudgets[month] || 0)

  useEffect(() => {
    setBudgetInput(isBudgetSet ? String(monthlyBudget || '') : '')
  }, [month, monthlyBudgets, isBudgetSet, monthlyBudget])

  const previousMonth = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    const prevDate = new Date(year, monthNum - 2, 1)
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  }, [month])

  const previousBudget = monthlyBudgets[previousMonth]

  const handleCopyPreviousBudget = async () => {
    if (previousBudget !== undefined) {
      await setMonthlyBudget(month, previousBudget)
      setBudgetInput(String(previousBudget))
    }
  }

  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      const inMonth = expense.date.startsWith(month)
      const inCategory = categoryFilter === 'all' || expense.category === categoryFilter
      const inType = typeFilter === 'all' || expense.type === typeFilter
      const inPayment = paymentFilter === 'all' || expense.paymentMethod === paymentFilter
      const searchText = `${expense.title} ${expense.note || ''}`.toLowerCase()
      const matchesQuery = searchText.includes(query.trim().toLowerCase())
      return inMonth && inCategory && inType && inPayment && matchesQuery
    })
  }, [expenses, month, categoryFilter, typeFilter, paymentFilter, query])

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(month)),
    [expenses, month],
  )

  const monthIncome = monthExpenses
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const total = monthExpenses
    .filter((item) => item.type !== 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const balance = monthIncome - total
  const remaining = monthlyBudget - total
  const percentUsed = isBudgetSet && monthlyBudget > 0 ? Math.round((total / monthlyBudget) * 100) : 0
  const budgetStatus = percentUsed >= 100 ? 'exceeded' : percentUsed >= 80 ? 'warning' : 'normal'
  const categoryTotals = monthExpenses.filter((item) => item.type !== 'income').reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount)
    return acc
  }, {})
  const maxCategory = Math.max(0, ...Object.values(categoryTotals))

  const monthlyTotals = useMemo(() => {
    const totals = expenses.reduce((acc, item) => {
      const monthKey = item.date.slice(0, 7)
      const monthTotals = acc[monthKey] || { income: 0, expense: 0 }
      monthTotals[item.type === 'income' ? 'income' : 'expense'] += Number(item.amount)
      acc[monthKey] = monthTotals
      return acc
    }, {})
    return Object.entries(totals)
      .sort(([first], [second]) => second.localeCompare(first))
      .slice(0, 6)
      .map(([monthValue, values]) => ({
        month: monthValue,
        ...values,
        balance: values.income - values.expense,
      }))
      .reverse()
  }, [expenses])

  const handleStartRecurringEdit = (item) => {
    setEditingRecurring(item)
    setRecurringForm({
      title: item.title,
      amount: String(item.amount),
      category: item.category,
      paymentMethod: item.paymentMethod,
      cadence: item.cadence,
      nextDate: item.nextDate,
      note: item.note || '',
    })
  }

  const handleCancelRecurringEdit = () => {
    setEditingRecurring(null)
    setRecurringForm({
      title: '',
      amount: '',
      category: 'food',
      paymentMethod: 'upi',
      cadence: 'monthly',
      nextDate: todayIso(),
      note: '',
    })
  }

  const handleRecurringSubmit = async (event) => {
    event.preventDefault()
    const amount = Number(recurringForm.amount)
    if (!recurringForm.title.trim() || !Number.isFinite(amount) || amount <= 0) return

    const payload = {
      title: recurringForm.title.trim(),
      amount,
      category: recurringForm.category,
      paymentMethod: recurringForm.paymentMethod,
      cadence: recurringForm.cadence,
      nextDate: recurringForm.nextDate,
      note: recurringForm.note.trim(),
    }

    if (editingRecurring) {
      const result = await updateRecurringExpense(editingRecurring.id, payload)
      if (result) {
        setEditingRecurring(null)
        setRecurringForm({
          title: '',
          amount: '',
          category: 'food',
          paymentMethod: 'upi',
          cadence: 'monthly',
          nextDate: todayIso(),
          note: '',
        })
      }
    } else {
      const result = await addRecurringExpense({
        ...payload,
        isActive: true,
      })
      if (result) {
        setRecurringForm({
          title: '',
          amount: '',
          category: 'food',
          paymentMethod: 'upi',
          cadence: 'monthly',
          nextDate: todayIso(),
          note: '',
        })
      }
    }
  }

  const handleAuthSubmit = async (form) => {
    try {
      if (authMode === 'signin') {
        await signIn({ email: form.email, password: form.password })
      } else {
        await signUp({
          name: form.name,
          email: form.email,
          password: form.password,
        })
      }
      setAuthError('')
    } catch (error) {
      setAuthError(error.message || 'Authentication failed.')
    }
  }

  const handleSubmit = async (payload) => {
    if (editing) {
      const result = await updateExpense(editing.id, payload)
      if (result) {
        setEditing(null)
        return true
      }
      return false
    } else {
      const result = await addExpense(payload)
      return Boolean(result)
    }
  }

  const formType = editing?.type || entryType

  if (!isAuthenticated || !currentUser) {
    return (
      <AuthScreen
        onSubmit={handleAuthSubmit}
        isSignUp={authMode === 'signup'}
        setIsSignUp={(value) => {
          setAuthMode(value ? 'signup' : 'signin')
          setAuthError('')
        }}
        error={authError}
      />
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <Wallet size={22} />
          </div>
          <div>
            {/* <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Finora</p> */}
            <h1 className="text-xl font-semibold sm:text-2xl">Expense Tracker</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="text-sm">
            <span className="sr-only">Select month</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
            />
          </label>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
            <Shield size={16} className="text-emerald-300" />
            {currentUser.email}
          </div>

          <button
            type="button"
            onClick={syncNow}
            disabled={isExpensesLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/15 disabled:opacity-60"
            aria-busy={isExpensesLoading}
          >
            <RefreshCcw size={16} className={isExpensesLoading ? 'animate-spin' : ''} />
            {isExpensesLoading ? 'Syncing…' : 'Sync'}
          </button>

          <button
            type="button"
            onClick={async () => {
              await signOut()
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      {isExpensesLoading && (
        <div className="mb-2 h-0.5 w-full overflow-hidden rounded-full">
          <div className="h-full animate-[pulse_1.2s_ease-in-out_infinite] bg-emerald-400/60" style={{ width: '100%' }} />
        </div>
      )}

      {expensesError && !isExpensesLoading && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300" role="alert">
          <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
          <div className="flex-1">
            <span className="font-medium">Sync error: </span>
            Network issue. Click Retry to re-submit your transaction.
          </div>
          <button
            type="button"
            onClick={syncNow}
            className="shrink-0 rounded-lg border border-red-400/20 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-400/10"
          >
            Retry
          </button>
        </div>
      )}

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
        <SummaryCards
          income={monthIncome}
          total={total}
          count={monthExpenses.length}
          budget={monthlyBudget}
          remaining={remaining}
          balance={balance}
          isBudgetSet={isBudgetSet}
        />

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Cloud size={18} className="text-emerald-300" />
              <span className="text-sm font-medium">Cloud sync</span>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${syncStatus.online ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>
              <span className={`h-2 w-2 rounded-full ${syncStatus.online ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              {syncStatus.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-lg font-semibold">{syncStatus.status}</p>
          <p className="mt-1 text-sm text-slate-400">{formatSyncTime(syncStatus.lastSyncedAt)}</p>
          <button
            type="button"
            onClick={syncNow}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
          >
            <Cloud size={16} />
            Sync now
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold">{editing ? `Edit ${formType}` : 'Add transaction'}</h2>
          {!editing ? (
            <div className="mb-4 flex gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setEntryType('expense')}
                className={`rounded-lg px-3 py-2 text-sm ${entryType === 'expense' ? 'bg-orange-400 text-slate-950' : 'border border-white/15 text-slate-300 hover:bg-white/5'}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setEntryType('income')}
                className={`rounded-lg px-3 py-2 text-sm ${entryType === 'income' ? 'bg-emerald-400 text-slate-950' : 'border border-white/15 text-slate-300 hover:bg-white/5'}`}
              >
                Income
              </button>
            </div>
          ) : null}
          {formType === 'income' ? (
            <IncomeForm
              editing={editing}
              onSubmit={handleSubmit}
              onCancel={() => setEditing(null)}
              resetKey={formResetKey}
              registerResetCallback={registerFormResetCallback}
            />
          ) : (
            <ExpenseForm
              editing={editing}
              onSubmit={handleSubmit}
              onCancel={() => setEditing(null)}
              resetKey={formResetKey}
              registerResetCallback={registerFormResetCallback}
            />
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Budget overview</h2>
              {isBudgetSet ? (
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  budgetStatus === 'exceeded'
                    ? 'border-red-400/30 bg-red-400/10 text-red-300'
                    : budgetStatus === 'warning'
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                    : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                }`}>
                  {budgetStatus === 'exceeded' ? 'Exceeded' : budgetStatus === 'warning' ? 'Warning' : 'On track'}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
                  Not set
                </span>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <div>
                <p className="text-sm text-slate-400">Monthly limit</p>
                <p className="text-2xl font-semibold">
                  {isBudgetSet ? `₹${monthlyBudget.toLocaleString('en-IN')}` : 'Not set'}
                </p>
              </div>
              <PiggyBank className="text-emerald-300" />
            </div>

            {isBudgetSet ? (
              <div className="mb-4 space-y-2.5 rounded-2xl border border-white/10 bg-slate-950/40 p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Budget progress</span>
                  <span className={`font-semibold ${
                    budgetStatus === 'exceeded'
                      ? 'text-red-300'
                      : budgetStatus === 'warning'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}>
                    {percentUsed}%
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      budgetStatus === 'exceeded'
                        ? 'bg-red-400'
                        : budgetStatus === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    budgetStatus === 'exceeded'
                      ? 'border-red-400/30 bg-red-400/10 text-red-300'
                      : budgetStatus === 'warning'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  }`}>
                    {percentUsed}% used
                  </span>
                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    remaining < 0
                      ? 'border-red-400/30 bg-red-400/10 text-red-300'
                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  }`}>
                    {remaining < 0
                      ? `Overspend: ₹${Math.abs(remaining).toLocaleString('en-IN')}`
                      : `Remaining: ₹${remaining.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            ) : null}

            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault()
                await setMonthlyBudget(month, budgetInput)
                setBudgetInput(String(Math.max(0, Number(budgetInput) || 0)))
              }}
            >
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">Set budget for {monthLabel(month)}</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={budgetInput}
                    onChange={(event) => setBudgetInput(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                    placeholder="25000"
                  />
                  <button type="submit" className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Save</button>
                </div>
              </label>
            </form>

            {!isBudgetSet && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-3 text-sm">
                <span className="text-xs text-slate-400">
                  {previousBudget !== undefined
                    ? `Previous (${monthLabel(previousMonth)}): ₹${Number(previousBudget).toLocaleString('en-IN')}`
                    : `No budget set for ${monthLabel(month)}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPreviousBudget}
                  disabled={previousBudget === undefined}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    previousBudget !== undefined
                      ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                      : 'bg-white/10 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Copy from previous month
                </button>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
              <div className="mb-1 flex justify-between">
                <span>Spent</span>
                <span className="font-medium">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining</span>
                <span className={remaining < 0 ? 'font-medium text-red-300' : 'font-medium text-emerald-300'}>
                  {isBudgetSet ? `₹${remaining.toLocaleString('en-IN')}` : 'Not set'}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Recurring expenses</h2>
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
                {recurringExpenses.filter((item) => item.isActive).length} active
              </span>
            </div>

            <form className="space-y-3" onSubmit={handleRecurringSubmit}>
              <input
                value={recurringForm.title}
                onChange={(event) => setRecurringForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Netflix, gym, rent..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={recurringForm.amount}
                  onChange={(event) => setRecurringForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="Amount"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                  required
                />
                <select
                  value={recurringForm.cadence}
                  onChange={(event) => setRecurringForm((prev) => ({ ...prev, cadence: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={recurringForm.category}
                  onChange={(event) => setRecurringForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
                <select
                  value={recurringForm.paymentMethod}
                  onChange={(event) => setRecurringForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>{method.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={recurringForm.nextDate}
                  onChange={(event) => setRecurringForm((prev) => ({ ...prev, nextDate: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                  required
                />
                <input
                  value={recurringForm.note}
                  onChange={(event) => setRecurringForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Note (optional)"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
                >
                  {editingRecurring ? 'Save changes' : 'Add'}
                </button>
                {editingRecurring ? (
                  <button
                    type="button"
                    onClick={handleCancelRecurringEdit}
                    className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {recurringExpenses.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  No recurring expenses yet.
                </li>
              ) : (
                recurringExpenses.map((item) => {
                  const isEditingThis = editingRecurring?.id === item.id
                  return (
                    <li
                      key={item.id}
                      className={`flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between transition ${
                        isEditingThis
                          ? 'border-emerald-400/40 bg-emerald-400/5'
                          : 'border-white/10 bg-slate-950/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{item.title}</p>
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                              item.isActive
                                ? 'bg-emerald-400/10 text-emerald-300'
                                : 'bg-amber-400/10 text-amber-300'
                            }`}
                          >
                            {item.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          <span className="capitalize">{item.cadence}</span> • Next: {item.nextDate}
                          {item.note ? ` • ${item.note}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="font-medium text-orange-300">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartRecurringEdit(item)}
                            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
                            aria-label={`Edit ${item.title}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRecurringExpense(item.id, { isActive: !item.isActive })}
                            className={`rounded-lg border px-2 py-1 text-xs transition ${
                              item.isActive
                                ? 'border-amber-400/20 text-amber-300 hover:bg-amber-400/10'
                                : 'border-emerald-400/20 text-emerald-300 hover:bg-emerald-400/10'
                            }`}
                            aria-label={`${item.isActive ? 'Pause' : 'Resume'} ${item.title}`}
                          >
                            {item.isActive ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingThis) {
                                handleCancelRecurringEdit()
                              }
                              removeRecurringExpense(item.id)
                            }}
                            className="rounded-lg border border-red-400/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/15"
                            aria-label={`Remove ${item.title}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Transactions ({filtered.length})</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title or note"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-sm outline-none ring-emerald-400/40 focus:ring-2 sm:w-56"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:ring-2"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:ring-2"
            >
              <option value="all">Income & expenses</option>
              <option value="income">Income only</option>
              <option value="expense">Expenses only</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:ring-2"
            >
              <option value="all">All payment methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ExpenseList
            expenses={filtered}
            onEdit={(transaction) => {
              setEditing(transaction)
              setEntryType(transaction.type)
            }}
            onDelete={deleteExpense}
          />

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">Category breakdown</h3>
                <ArrowDownLeft size={16} className="text-orange-300" />
              </div>
              <CategoryBars totals={categoryTotals} maxTotal={maxCategory} totalMonthlySpend={total} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">Monthly trend</h3>
                <ArrowUpRight size={16} className="text-emerald-300" />
              </div>
              <MonthlyTrend totals={monthlyTotals} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-200">
                <CalendarDays size={16} className="text-emerald-300" />
                <h3 className="text-base font-semibold">Smart features</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> Authentication</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> Local database</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> Cloud sync status</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> Budgets & recurring items</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> Mobile-first PWA</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
