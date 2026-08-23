export const CATEGORIES = [
  { id: 'food', label: 'Food', color: 'bg-orange-400' },
  { id: 'transport', label: 'Transport', color: 'bg-sky-400' },
  { id: 'bills', label: 'Bills', color: 'bg-violet-400' },
  { id: 'shopping', label: 'Shopping', color: 'bg-pink-400' },
  { id: 'entertainment', label: 'Entertainment', color: 'bg-amber-400' },
  { id: 'health', label: 'Health', color: 'bg-emerald-400' },
  { id: 'other', label: 'Other', color: 'bg-slate-400' },
]

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function monthLabel(monthValue) {
  const [year, month] = monthValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}
