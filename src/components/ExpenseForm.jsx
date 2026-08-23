import { useEffect, useState } from 'react'
import { CATEGORIES, todayIso } from '../lib/format'

const emptyForm = {
  title: '',
  amount: '',
  category: 'food',
  date: todayIso(),
  note: '',
}

export default function ExpenseForm({ onSubmit, editing, onCancel }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        amount: String(editing.amount),
        category: editing.category,
        date: editing.date,
        note: editing.note || '',
      })
    } else {
      setForm({ ...emptyForm, date: todayIso() })
    }
  }, [editing])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return

    onSubmit({
      title: form.title.trim(),
      amount,
      category: form.category,
      date: form.date,
      note: form.note.trim(),
    })

    if (!editing) {
      setForm({ ...emptyForm, date: todayIso() })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Title</span>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Lunch, Uber, electricity..."
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
            placeholder="250"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Category</span>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-emerald-400/40 focus:ring-2"
          >
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
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
          {editing ? 'Save changes' : 'Add expense'}
        </button>
        {editing ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
