import { useEffect, useState } from 'react'
import { INCOME_SOURCES, PAYMENT_METHODS, todayIso } from '../lib/format'

const emptyForm = {
  title: '',
  amount: '',
  source: 'salary',
  date: todayIso(),
  note: '',
  paymentMethod: 'bank',
}

export default function IncomeForm({ onSubmit, editing, onCancel, resetKey, registerResetCallback }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        amount: String(editing.amount),
        category: editing.category,
        source: editing.source || editing.category || 'other',
        date: editing.date,
        note: editing.note || '',
        paymentMethod: editing.paymentMethod || 'other',
      })
    } else {
      setForm({ ...emptyForm, date: todayIso() })
    }
  }, [editing, resetKey])

  useEffect(() => {
    if (typeof registerResetCallback === 'function') {
      return registerResetCallback((action) => {
        if (!editing) {
          setForm({ ...emptyForm, date: todayIso() })
        }
      })
    }
  }, [registerResetCallback, editing])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return

    const success = await onSubmit({
      title: form.title.trim(),
      amount,
      source: form.source,
      category: 'other',
      paymentMethod: form.paymentMethod,
      date: form.date,
      note: form.note.trim(),
      type: 'income',
    })

    if (success && !editing) setForm({ ...emptyForm, date: todayIso() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Income name</span>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Monthly salary, client payment..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Amount (₹)</span>
          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            value={form.amount}
            onChange={handleChange}
            placeholder="50000"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Income source</span>
          <select
            name="source"
            value={form.source}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
          >
            {INCOME_SOURCES.map((source) => (
              <option key={source.id} value={source.id}>{source.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Date</span>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Payment method</span>
          <select
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.id} value={method.id}>{method.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Note (optional)</span>
        <input
          name="note"
          value={form.note}
          onChange={handleChange}
          placeholder="Any extra detail"
          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          {editing ? 'Save changes' : 'Add income'}
        </button>
        {editing ? (
          <button type="button" onClick={onCancel} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
