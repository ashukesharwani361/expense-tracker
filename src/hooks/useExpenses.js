import { useCallback, useEffect, useMemo, useState } from 'react'
import { currentMonthValue, todayIso } from '../lib/format'
import { mapSupabaseUser, supabase } from '../lib/supabase'

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
      const persisted = {
        ...seeded,
        expenses: [],
      }
      localStorage.setItem(key, JSON.stringify(persisted))
      return {
        expenses: [],
        monthlyBudgets: seeded.monthlyBudgets,
        recurringExpenses: seeded.recurringExpenses,
      }
    }

    const parsed = JSON.parse(raw)
    const monthlyBudgets = parsed.monthlyBudgets && typeof parsed.monthlyBudgets === 'object'
      ? parsed.monthlyBudgets
      : {}
    const recurringExpenses = (Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [])
      .map(normalizeRecurring)
      .filter(Boolean)

    return {
      expenses: [],
      monthlyBudgets,
      recurringExpenses,
    }
  } catch {
    return createEmptyData()
  }
}

function normalizeSupabaseExpense(record) {
  if (!record || typeof record !== 'object') return null

  const amount = Number(record.amount)
  if (!record.id || !record.title || !record.date || !Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return {
    id: record.id,
    title: record.title,
    amount,
    category: record.category || 'other',
    paymentMethod: record.payment_method || record.paymentMethod || 'other',
    date: record.date,
    note: record.note || '',
    type: record.type === 'income' ? 'income' : 'expense',
    source: record.source || (record.type === 'income' ? record.category : null) || 'other',
  }
}

function mapExpenseToSupabase(item, userId) {
  const normalized = normalizeTransaction(item)
  if (!normalized || !userId) return null

  return {
    title: normalized.title,
    amount: Number(normalized.amount),
    category: normalized.category || 'other',
    payment_method: normalized.paymentMethod || 'other',
    date: normalized.date,
    note: normalized.note || '',
    type: normalized.type === 'income' ? 'income' : 'expense',
    source: normalized.source || (normalized.type === 'income' ? normalized.category : null) || 'other',
    user_id: userId,
  }
}

function normalizeSupabaseRecurring(record) {
  if (!record || typeof record !== 'object') return null

  const amount = Number(record.amount)
  if (!record.id || !record.title || !Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return {
    id: record.id,
    title: record.title,
    amount,
    category: record.category || 'other',
    paymentMethod: record.payment_method || record.paymentMethod || 'upi',
    cadence: record.cadence || 'monthly',
    nextDate: record.next_date || record.nextDate || todayIso(),
    isActive: record.is_active !== false,
    note: record.note || '',
  }
}

function mapRecurringToSupabase(item, userId) {
  const normalized = normalizeRecurring(item)
  if (!normalized || !userId) return null

  return {
    title: normalized.title,
    amount: Number(normalized.amount),
    category: normalized.category || 'other',
    payment_method: normalized.paymentMethod || 'upi',
    cadence: normalized.cadence || 'monthly',
    next_date: normalized.nextDate || todayIso(),
    is_active: normalized.isActive !== false,
    note: normalized.note || '',
    user_id: userId,
  }
}

function normalizeSupabaseMonthlyBudget(record) {
  if (!record || typeof record !== 'object') return null
  const month = record.month
  const amount = Number(record.amount)
  if (!month || !Number.isFinite(amount)) return null
  return { month, amount }
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

async function syncSupabaseProfileName(name) {
  if (!supabase || !name) return null

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    })

    if (error) {
      return null
    }

    return data?.user ?? null
  } catch {
    return null
  }
}

export function useExpenses() {
  const [currentUser, setCurrentUser] = useState(null)
  const [data, setData] = useState(() => loadState(DEMO_USER.id))
  const [syncState, setSyncState] = useState(() => loadSyncState(DEMO_USER.id))
  const [isExpensesLoading, setIsExpensesLoading] = useState(false)
  const [expensesError, setExpensesError] = useState(null)

  const fetchUserExpenses = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setExpensesError(null)
      setIsExpensesLoading(false)
      setData((prev) => ({ ...prev, expenses: [] }))
      return []
    }

    setIsExpensesLoading(true)
    setExpensesError(null)

    try {
      const { data: rows, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const nextExpenses = (Array.isArray(rows) ? rows : [])
        .map(normalizeSupabaseExpense)
        .filter(Boolean)

      setData((prev) => ({ ...prev, expenses: nextExpenses }))
      setSyncState((prev) => ({
        ...prev,
        status: 'Synced to cloud',
      }))
      return nextExpenses
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load expenses.'
      setExpensesError(message)
      setData((prev) => ({ ...prev, expenses: [] }))
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense sync failed',
      }))
      return []
    } finally {
      setIsExpensesLoading(false)
    }
  }, [])

  const fetchUserRecurringExpenses = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setData((prev) => ({ ...prev, recurringExpenses: [] }))
      return []
    }

    try {
      const { data: rows, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const nextRecurring = (Array.isArray(rows) ? rows : [])
        .map(normalizeSupabaseRecurring)
        .filter(Boolean)

      setData((prev) => ({ ...prev, recurringExpenses: nextRecurring }))
      return nextRecurring
    } catch (error) {
      setData((prev) => ({ ...prev, recurringExpenses: [] }))
      return []
    }
  }, [])

  const fetchUserMonthlyBudgets = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setData((prev) => ({ ...prev, monthlyBudgets: {} }))
      return {}
    }

    try {
      const { data: rows, error } = await supabase
        .from('monthly_budgets')
        .select('month, amount')
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      const monthlyBudgets = {}
      if (Array.isArray(rows)) {
        rows.forEach((row) => {
          const normalized = normalizeSupabaseMonthlyBudget(row)
          if (normalized) {
            monthlyBudgets[normalized.month] = normalized.amount
          }
        })
      }

      setData((prev) => ({ ...prev, monthlyBudgets }))
      return monthlyBudgets
    } catch (error) {
      setData((prev) => ({ ...prev, monthlyBudgets: {} }))
      return {}
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setCurrentUser(null)
      setData(loadState(DEMO_USER.id))
      setSyncState(loadSyncState(DEMO_USER.id))
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return

      if (session?.user) {
        const nextUser = mapSupabaseUser(session.user)
        setCurrentUser(nextUser)
        setData({ ...loadState(nextUser.id), expenses: [], recurringExpenses: [], monthlyBudgets: {} })
        setSyncState(loadSyncState(nextUser.id))
        await fetchUserExpenses(nextUser.id)
        await fetchUserRecurringExpenses(nextUser.id)
        await fetchUserMonthlyBudgets(nextUser.id)
        return
      }

      setCurrentUser(null)
      setData(loadState(DEMO_USER.id))
      setSyncState(loadSyncState(DEMO_USER.id))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      if (session?.user) {
        const nextUser = mapSupabaseUser(session.user)
        setCurrentUser(nextUser)
        setData({ ...loadState(nextUser.id), expenses: [], recurringExpenses: [], monthlyBudgets: {} })
        setSyncState(loadSyncState(nextUser.id))
        fetchUserExpenses(nextUser.id)
        fetchUserRecurringExpenses(nextUser.id)
        fetchUserMonthlyBudgets(nextUser.id)
      } else {
        setCurrentUser(null)
        setData(loadState(DEMO_USER.id))
        setSyncState(loadSyncState(DEMO_USER.id))
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchUserExpenses, fetchUserRecurringExpenses, fetchUserMonthlyBudgets])

  useEffect(() => {
    const userId = currentUser?.id || DEMO_USER.id
    const persisted = {
      ...data,
      expenses: [],
    }
    localStorage.setItem(`${DATA_PREFIX}${userId}`, JSON.stringify(persisted))
  }, [currentUser?.id, data])

  useEffect(() => {
    const userId = currentUser?.id || DEMO_USER.id
    localStorage.setItem(`${SYNC_PREFIX}${userId}`, JSON.stringify(syncState))
  }, [currentUser?.id, syncState])

  const signIn = async ({ email, password }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    const normalizedEmail = email.trim().toLowerCase()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        throw new Error(error.message || 'Incorrect email or password.')
      }

      if (!data?.user) {
        throw new Error('No user was returned from Supabase.')
      }

      const profileUser = await syncSupabaseProfileName(
        data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
      ) || data.user

      const nextUser = mapSupabaseUser(profileUser)
      setCurrentUser(nextUser)
      setData({ ...loadState(nextUser.id), expenses: [] })
      setSyncState(loadSyncState(nextUser.id))
      await fetchUserExpenses(nextUser.id)
      return profileUser
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Unable to sign in.')
    }
  }

  const signUp = async ({ name, email, password }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanName || !cleanEmail || !password) {
      throw new Error('Please fill in all fields.')
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      })

      if (error) {
        throw new Error(error.message || 'Unable to create your account.')
      }

      if (!data?.user) {
        throw new Error('No user was returned from Supabase.')
      }

      if (!data.session) {
        throw new Error('Check your email to confirm your account before signing in.')
      }

      const profileUser = await syncSupabaseProfileName(cleanName) || data.user
      const nextUser = mapSupabaseUser(profileUser)
      setCurrentUser(nextUser)
      setData({ ...loadState(nextUser.id), expenses: [] })
      setSyncState(loadSyncState(nextUser.id))
      await fetchUserExpenses(nextUser.id)
      return profileUser
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Unable to create your account.')
    }
  }

  const signOut = async () => {
    if (!supabase) {
      setCurrentUser(null)
      setData(createEmptyData())
      return
    }

    try {
      await supabase.auth.signOut()
    } catch {
      // ignore Supabase sign-out errors and continue with UI cleanup
    }

    setCurrentUser(null)
    setData(createEmptyData())
    setExpensesError(null)
    setIsExpensesLoading(false)
  }

  const addExpense = async (expense) => {
    if (!supabase || !currentUser?.id) {
      return null
    }

    // Generate ID if not present
    const expenseWithId = expense.id ? expense : { ...expense, id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }
    
    const payload = mapExpenseToSupabase(expenseWithId, currentUser.id)
    if (!payload) {
      return null
    }

    try {
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select('*')
        .single()

      if (error) {
        throw error
      }

      const nextExpense = normalizeSupabaseExpense(inserted)
      if (!nextExpense) {
        return null
      }

      setData((prev) => ({
        ...prev,
        expenses: [nextExpense, ...prev.expenses.filter((item) => item.id !== nextExpense.id)],
      }))
      setExpensesError(null)
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense saved to cloud',
      }))
      return nextExpense
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save expense.'
      setExpensesError(message)
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense sync failed',
      }))
      return null
    }
  }

  const updateExpense = async (id, updates) => {
    if (!supabase || !currentUser?.id || !id) {
      return null
    }

    const existing = data.expenses.find((item) => item.id === id)
    if (!existing) {
      return null
    }

    const payload = mapExpenseToSupabase({ ...existing, ...updates }, currentUser.id)
    if (!payload) {
      return null
    }

    try {
      const { data: updated, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      const nextExpense = normalizeSupabaseExpense(updated)
      if (!nextExpense) {
        return null
      }

      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((item) => item.id === id ? nextExpense : item),
      }))
      setExpensesError(null)
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense updated in cloud',
      }))
      return nextExpense
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update expense.'
      setExpensesError(message)
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense sync failed',
      }))
      return null
    }
  }

  const deleteExpense = async (id) => {
    if (!supabase || !currentUser?.id || !id) {
      return false
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id)

      if (error) {
        throw error
      }

      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((item) => item.id !== id),
      }))
      setExpensesError(null)
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense removed from cloud',
      }))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete expense.'
      setExpensesError(message)
      setSyncState((prev) => ({
        ...prev,
        status: 'Expense sync failed',
      }))
      return false
    }
  }

  const setMonthlyBudget = async (month, value) => {
    if (!supabase || !currentUser?.id) {
      return false
    }

    const amount = Math.max(0, Number(value) || 0)

    try {
      const { error } = await supabase
        .from('monthly_budgets')
        .upsert(
          {
            user_id: currentUser.id,
            month,
            amount,
          },
          {
            onConflict: 'user_id,month',
          }
        )

      if (error) {
        throw error
      }

      setData((prev) => ({
        ...prev,
        monthlyBudgets: {
          ...prev.monthlyBudgets,
          [month]: amount,
        },
      }))
      setSyncState((prev) => ({
        ...prev,
        status: 'Budget saved to cloud',
      }))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save budget.'
      setSyncState((prev) => ({
        ...prev,
        status: 'Budget sync failed',
      }))
      return false
    }
  }

  const addRecurringExpense = async (recurring) => {
    if (!supabase || !currentUser?.id) {
      return null
    }

    // Generate ID if not present
    const recurringWithId = recurring.id ? recurring : { ...recurring, id: `recurring-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }

    const payload = mapRecurringToSupabase(recurringWithId, currentUser.id)
    if (!payload) {
      return null
    }

    try {
      const { data: inserted, error } = await supabase
        .from('recurring_expenses')
        .insert([payload])
        .select('*')
        .single()

      if (error) {
        throw error
      }

      const nextRecurring = normalizeSupabaseRecurring(inserted)
      if (!nextRecurring) {
        return null
      }

      setData((prev) => ({
        ...prev,
        recurringExpenses: [nextRecurring, ...prev.recurringExpenses],
      }))
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense saved to cloud',
      }))
      return nextRecurring
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save recurring expense.'
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense sync failed',
      }))
      return null
    }
  }

  const removeRecurringExpense = async (id) => {
    if (!supabase || !currentUser?.id) {
      return false
    }

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id)

      if (error) {
        throw error
      }

      setData((prev) => ({
        ...prev,
        recurringExpenses: prev.recurringExpenses.filter((item) => item.id !== id),
      }))
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense removed from cloud',
      }))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete recurring expense.'
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense sync failed',
      }))
      return false
    }
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
    isExpensesLoading,
    expensesError,
  }
}
