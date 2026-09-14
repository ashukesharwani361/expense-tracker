import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from 'lucide-react'
import { formatCurrency } from '../lib/format'

function Card({ icon: Icon, label, value, hint, valueClassName }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
        <Icon size={20} />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-tight tracking-tight sm:text-lg xl:text-[1.25rem] 2xl:text-[1.4rem] ${valueClassName || ''}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

export default function SummaryCards({ income, total, count, budget, remaining, balance, isBudgetSet }) {
  const isSet = isBudgetSet !== undefined ? isBudgetSet : budget > 0
  const isOver = isSet && remaining < 0

  let budgetLabel = 'Monthly budget'
  let budgetValue = 'Not set'
  let budgetValueClass = ''
  let budgetHint = undefined

  if (isSet) {
    budgetLabel = 'Budget remaining'
    budgetHint = `Limit: ${formatCurrency(budget)}`
    if (isOver) {
      budgetValue = `Over budget by ${formatCurrency(Math.abs(remaining))}`
      budgetValueClass = 'text-red-400'
    } else {
      budgetValue = `${formatCurrency(remaining)} remaining`
      budgetValueClass = 'text-emerald-300'
    }
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card icon={ArrowUpRight} label="Income this month" value={formatCurrency(income)} />
      <Card
        icon={ArrowDownLeft}
        label="Spent this month"
        value={formatCurrency(total)}
      />
      <Card icon={Wallet} label="Net balance" value={formatCurrency(balance)} />
      <Card
        icon={Receipt}
        label="Transactions"
        value={String(count)}
      />
      <Card
        icon={Wallet}
        label={budgetLabel}
        value={budgetValue}
        valueClassName={budgetValueClass}
        hint={budgetHint}
      />
    </section>
  )
}
