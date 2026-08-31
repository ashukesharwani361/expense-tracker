import { useEffect, useMemo, useState } from 'react'
import { currentMonthValue, todayIso } from '../lib/format'

const AUTH_KEY = 'expense-tracker:auth:v1'
const USERS_KEY = 'expense-tracker:users:v1'
const DATA_PREFIX = 'expense-tracker:data:v1:'
const SYNC_PREFIX = 'expense-tracker:sync:v1:'

const DEMO_USER = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@finora.app',
  password: 'demo123',
}

function normalizeTransaction(item) {
  if (!item || typeof item !== 'object') return null
  const amount = Number(item.amount)
  if (!item.id || !item.title || !item.date || !Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return {
    ...item,
    amount,
    type: item.type === 'income' ? 'income' : 'expense',
    paymentMethod: item.paymentMethod || 'other',
    category: item.category || 'other',
    source: item.source || (item.type === 'income' ? item.category : null) || 'other',
    note: item.note || '',
  }
}

function normalizeRecurring(item) {
  if (!item || typeof item !== 'object') return null
  const amount = Number(item.amount)
  if (!item.id || !item.title || !Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return {
    ...item,
    amount,
    category: item.category || 'other',
    paymentMethod: item.paymentMethod || 'upi',
    cadence: item.cadence || 'monthly',
    nextDate: item.nextDate || todayIso(),
    isActive: item.isActive !== false,
    note: item.note || '',
  }
}

function createEmptyData() {
  return {
    expenses: [],
    monthlyBudgets: {},
    recurringExpenses: [],
  }
}

function createSampleData() {
  const month = currentMonthValue()
  return {
    expenses: [
      {
        id: 'seed-income-1',
        title: 'Salary',
        amount: 52000,
        category: 'other',
        paymentMethod: 'bank',
        date: `${month}-01`,
        note: 'Monthly salary',
        type: 'income',
        source: 'salary',
      },
      {
        id: 'seed-expense-1',
        title: 'Groceries',
        amount: 4200,
        category: 'food',
        paymentMethod: 'upi',
        date: `${month}-03`,
        note: 'Weekly market run',
        type: 'expense',
        source: null,
      },
      {
        id: 'seed-expense-2',
        title: 'Electricity bill',
        amount: 2600,
        category: 'bills',
        paymentMethod: 'bank',
        date: `${month}-08`,
        note: 'Power & utilities',
        type: 'expense',
        source: null,
      },
    ],
    monthlyBudgets: { [month]: 28000 },
    recurringExpenses: [
      {
        id: 'seed-recurring-1',
        title: 'Spotify',
        amount: 299,
        category: 'entertainment',
        paymentMethod: 'card',
        cadence: 'monthly',
        nextDate: `${month}-12`,
        isActive: true,
        note: 'Music subscription',
      },
      {
        id: 'seed-recurring-2',
        title: 'Internet',
        amount: 600,
        category: 'bills',
        paymentMethod: 'upi',
        cadence: 'monthly',
        nextDate: `${month}-15`,
        isActive: true,
        note: 'Home broadband',
      },
    ],
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const users = Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEMO_USER]
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    }
    return users
  } catch {
    return [DEMO_USER]
  }
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return DEMO_USER
    const parsed = JSON.parse(raw)
    return parsed && parsed.email ? parsed : DEMO_USER
  } catch {
    return DEMO_USER
  }
}

function loadState(userId) {
  try {
    const key = `${DATA_PREFIX}${userId}`
    const raw = localStorage.getItem(key)
    if (!raw) {
      const seeded = userId === DEMO_USER.id ? createSampleData() : createEmptyData()
      localStorage.setItem(key, JSON.stringify(seeded))
      return seeded
    }

    const parsed = JSON.parse(raw)
    const expenses = (Array.isArray(parsed.expenses) ? parsed.expenses : [])
      .map(normalizeTransaction)
      .filter(Boolean)
    const monthlyBudgets = parsed.monthlyBudgets && typeof parsed.monthlyBudgets === 'object'
      ? parsed.monthlyBudgets
      : {}
    const recurringExpenses = (Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [])
      .map(normalizeRecurring)
      .filter(Boolean)

    return {
      expenses,
      monthlyBudgets,
      recurringExpenses,
    }
  } catch {
    return createEmptyData()
  }
}

function loadSyncState(userId) {
  try {
    const raw = localStorage.getItem(`${SYNC_PREFIX}${userId}`)
    if (!raw) {
      return {
        online: navigator.onLine ?? true,
        status: 'Ready to sync',
        lastSyncedAt: null,
      }
    }
    return JSON.parse(raw)
  } catch {
    return {
      online: navigator.onLine ?? true,
      status: 'Ready to sync',
      lastSyncedAt: null,
    }
  }
}

export function useExpenses() {
  const [currentUser, setCurrentUser] = useState(loadAuth)
  const [data, setData] = useState(() => loadState(loadAuth().id))
  const [syncState, setSyncState] = useState(() => loadSyncState(loadAuth().id))

  useEffect(() => {
    const userId = currentUser?.id || DEMO_USER.id
    setData(loadState(userId))
    setSyncState(loadSyncState(userId))
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser) return
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser))
  }, [currentUser])

  useEffect(() => {
    const userId = currentUser?.id || DEMO_USER.id
    localStorage.setItem(`${DATA_PREFIX}${userId}`, JSON.stringify(data))
  }, [currentUser?.id, data])

  useEffect(() => {
    const userId = currentUser?.id || DEMO_USER.id
    localStorage.setItem(`${SYNC_PREFIX}${userId}`, JSON.stringify(syncState))
  }, [currentUser?.id, syncState])

  const signIn = ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const users = loadUsers()
    const match = users.find(
      (user) => user.email.toLowerCase() === normalizedEmail && user.password === password,
    )
    if (!match) {
      throw new Error('Incorrect email or password.')
    }

    const nextUser = { id: match.id, name: match.name, email: match.email }
    const nextData = loadState(match.id)
    setCurrentUser(nextUser)
    setData(nextData)
    setSyncState(loadSyncState(match.id))
    return match
  }

  const signUp = ({ name, email, password }) => {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanName || !cleanEmail || !password) {
      throw new Error('Please fill in all fields.')
    }

    const users = loadUsers()
    if (users.some((user) => user.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with that email already exists.')
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password,
    }

    const emptyData = createEmptyData()

    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]))
    setCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email })
    localStorage.setItem(`${DATA_PREFIX}${newUser.id}`, JSON.stringify(emptyData))
    setData(emptyData)
    setSyncState({ online: navigator.onLine ?? true, status: 'Ready to sync', lastSyncedAt: null })
    return newUser
  }

  const signOut = () => {
    setCurrentUser(null)
    setData(createEmptyData())
    localStorage.removeItem(AUTH_KEY)
  }

  const addExpense = (expense) => {
    setData((prev) => ({
      ...prev,
      expenses: [{ ...expense, id: crypto.randomUUID() }, ...prev.expenses],
    }))
  }

  const updateExpense = (id, updates) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }))
  }

  const deleteExpense = (id) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((item) => item.id !== id),
    }))
  }

  const setMonthlyBudget = (month, value) => {
    setData((prev) => ({
      ...prev,
      monthlyBudgets: {
        ...prev.monthlyBudgets,
        [month]: Math.max(0, Number(value) || 0),
      },
    }))
  }

  const addRecurringExpense = (recurring) => {
    setData((prev) => ({
      ...prev,
      recurringExpenses: [
        {
          ...recurring,
          id: crypto.randomUUID(),
          isActive: recurring.isActive !== false,
          nextDate: recurring.nextDate || todayIso(),
        },
        ...prev.recurringExpenses,
      ],
    }))
  }

  const removeRecurringExpense = (id) => {
    setData((prev) => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.filter((item) => item.id !== id),
    }))
  }

  const syncNow = () => {
    const timestamp = new Date().toISOString()
    setSyncState({
      online: navigator.onLine ?? true,
      status: 'Synced to cloud',
      lastSyncedAt: timestamp,
    })
    return timestamp
  }

  const byId = useMemo(
    () => Object.fromEntries(data.expenses.map((item) => [item.id, item])),
    [data.expenses],
  )

  return {
    currentUser,
    isAuthenticated: Boolean(currentUser),
    signIn,
    signUp,
    signOut,
    expenses: data.expenses,
    monthlyBudgets: data.monthlyBudgets,
    recurringExpenses: data.recurringExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    setMonthlyBudget,
    addRecurringExpense,
    removeRecurringExpense,
    syncNow,
    syncStatus: syncState,
    byId,
  }
}
