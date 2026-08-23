import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'expense-tracker:v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { expenses: [], monthlyBudget: 0 }
    const parsed = JSON.parse(raw)
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      monthlyBudget: Number(parsed.monthlyBudget) || 0,
    }
  } catch {
    return { expenses: [], monthlyBudget: 0 }
  }
}

export function useExpenses() {
  const [{ expenses, monthlyBudget }, setState] = useState(loadState)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ expenses, monthlyBudget }),
    )
  }, [expenses, monthlyBudget])

  const addExpense = (expense) => {
    setState((prev) => ({
      ...prev,
      expenses: [{ ...expense, id: crypto.randomUUID() }, ...prev.expenses],
    }))
  }

  const updateExpense = (id, updates) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }))
  }

  const deleteExpense = (id) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((item) => item.id !== id),
    }))
  }

  const setMonthlyBudget = (value) => {
    setState((prev) => ({
      ...prev,
      monthlyBudget: Math.max(0, Number(value) || 0),
    }))
  }

  const byId = useMemo(
    () => Object.fromEntries(expenses.map((item) => [item.id, item])),
    [expenses],
  )

  return {
    expenses,
    monthlyBudget,
    addExpense,
    updateExpense,
    deleteExpense,
    setMonthlyBudget,
    byId,
  }
}
