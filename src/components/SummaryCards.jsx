import { IndianRupee, Receipt, Wallet } from 'lucide-react'
import { formatCurrency } from '../lib/format'

function Card({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
        <Icon size={20} />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

export default function SummaryCards({ total, count, budget, remaining }) {
  const over = budget > 0 && remaining < 0

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <Card
        icon={IndianRupee}
        label="Spent this month"
        value={formatCurrency(total)}
      />
      <Card
        icon={Receipt}
        label="Transactions"
        value={String(count)}
      />
      <Card
        icon={Wallet}
        label={budget > 0 ? 'Budget remaining' : 'Monthly budget'}
        value={budget > 0 ? formatCurrency(remaining) : 'Not set'}
        hint={over ? 'Over budget this month' : undefined}
      />
    </section>
  )
}
