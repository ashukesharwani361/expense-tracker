import { useCallback, useEffect, useMemo, useState } from 'react'
import { currentMonthValue, todayIso } from '../lib/format'
import {
  isOccurrenceDue,
  nextRecurringOccurrence,
  recurringOccurrenceId,
} from '../lib/recurrence'
import { mapSupabaseUser, supabase } from '../lib/supabase'

const DEMO_USER = {
  id: 'demo-user',
}

const MAX_RECURRING_OCCURRENCES_PER_DEFINITION = 520

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

function loadState(userId) {
  // Return seed data for demo user, empty data for others
  // Actual cloud data is fetched separately from Supabase
  const seeded = userId === DEMO_USER.id ? createSampleData() : createEmptyData()
  return {
    expenses: [],
    monthlyBudgets: seeded.monthlyBudgets,
    recurringExpenses: seeded.recurringExpenses,
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

function loadSyncState() {
  return {
    online: navigator.onLine ?? true,
    status: 'Ready to sync',
    lastSyncedAt: null,
  }
}

function isKnownOccurrenceDuplicate(error, occurrenceId) {
  if (error?.code !== '23505') return false

  const details = `${error.details || ''} ${error.message || ''}`
  return details.includes('expenses_pkey') || details.includes(`Key (id)=(${occurrenceId})`)
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
  const [syncState, setSyncState] = useState(() => loadSyncState())
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
      const message = error instanceof Error ? error.message : 'Unable to load recurring expenses.'
      setExpensesError(message)
      setData((prev) => ({ ...prev, recurringExpenses: [] }))
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense sync failed',
      }))
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

  const processRecurringExpenses = useCallback(async (userId, recurringDefinitions) => {
    if (!supabase || !userId || !Array.isArray(recurringDefinitions)) {
      return false
    }

    let processedAny = false
    let requiresRefresh = false

    try {
      for (const definition of recurringDefinitions) {
        let current = definition
        let occurrenceAttempts = 0

        while (current.isActive && isOccurrenceDue(current.nextDate)) {
          if (occurrenceAttempts >= MAX_RECURRING_OCCURRENCES_PER_DEFINITION) {
            throw new Error('Recurring expense processing limit reached before the schedule became current.')
          }

          occurrenceAttempts += 1
          requiresRefresh = true
          const occurrenceDate = current.nextDate
          const occurrenceId = await recurringOccurrenceId({
            userId,
            recurringExpenseId: current.id,
            occurrenceDate,
          })
          const payload = mapExpenseToSupabase({
            id: occurrenceId,
            title: current.title,
            amount: current.amount,
            category: current.category,
            paymentMethod: current.paymentMethod,
            date: occurrenceDate,
            note: current.note,
            type: 'expense',
          }, userId)

          if (!payload) {
            throw new Error('Unable to prepare recurring expense occurrence.')
          }

          const { error: insertError } = await supabase
            .from('expenses')
            .insert([{ ...payload, id: occurrenceId }])

          if (insertError && !isKnownOccurrenceDuplicate(insertError, occurrenceId)) {
            throw new Error(insertError.message || 'Unable to create recurring expense occurrence.')
          }

          const nextDate = nextRecurringOccurrence(occurrenceDate, current.cadence)
          const { data: updatedRow, error: updateError } = await supabase
            .from('recurring_expenses')
            .update({ next_date: nextDate })
            .eq('id', current.id)
            .eq('user_id', userId)
            .eq('next_date', occurrenceDate)
            .select('*')
            .maybeSingle()

          if (updateError) {
            throw new Error(updateError.message || 'Unable to advance recurring expense schedule.')
          }

          if (!updatedRow) {
            const { data: latestRow, error: latestError } = await supabase
              .from('recurring_expenses')
              .select('*')
              .eq('id', current.id)
              .eq('user_id', userId)
              .maybeSingle()

            if (latestError) {
              throw new Error(latestError.message || 'Unable to reconcile recurring expense schedule.')
            }

            if (!latestRow) break

            const latest = normalizeSupabaseRecurring(latestRow)
            if (!latest || latest.nextDate === occurrenceDate) {
              throw new Error('Recurring expense schedule could not be advanced safely.')
            }

            current = latest
            continue
          }

          const updated = normalizeSupabaseRecurring(updatedRow)
          if (!updated) {
            throw new Error('Recurring expense schedule returned invalid data.')
          }

          current = updated
          processedAny = true
        }
      }

      if (requiresRefresh) {
        await fetchUserExpenses(userId)
        await fetchUserRecurringExpenses(userId)
        setExpensesError(null)
        setSyncState((prev) => ({
          ...prev,
          status: processedAny ? 'Recurring expenses processed' : 'Synced to cloud',
        }))
      }

      return processedAny
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Recurring expense processing failed.'
      setExpensesError(message)
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense processing failed',
      }))
      return false
    }
  }, [fetchUserExpenses, fetchUserRecurringExpenses])

  const loadUserData = useCallback(async (userId) => {
    await fetchUserExpenses(userId)
    const recurringDefinitions = await fetchUserRecurringExpenses(userId)
    await fetchUserMonthlyBudgets(userId)
    await processRecurringExpenses(userId, recurringDefinitions)
  }, [fetchUserExpenses, fetchUserMonthlyBudgets, fetchUserRecurringExpenses, processRecurringExpenses])

  useEffect(() => {
    if (!supabase) {
      setCurrentUser(null)
      setData(loadState(DEMO_USER.id))
      setSyncState(loadSyncState())
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return

      if (session?.user) {
        const nextUser = mapSupabaseUser(session.user)
        setCurrentUser(nextUser)
        setData({ ...loadState(nextUser.id), expenses: [], recurringExpenses: [], monthlyBudgets: {} })
        setSyncState(loadSyncState())
        await loadUserData(nextUser.id)
        return
      }

      setCurrentUser(null)
      setData(loadState(DEMO_USER.id))
      setSyncState(loadSyncState())
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      if (session?.user) {
        const nextUser = mapSupabaseUser(session.user)
        setCurrentUser(nextUser)
        setData({ ...loadState(nextUser.id), expenses: [], recurringExpenses: [], monthlyBudgets: {} })
        setSyncState(loadSyncState())
        loadUserData(nextUser.id)
      } else {
        setCurrentUser(null)
        setData(loadState(DEMO_USER.id))
        setSyncState(loadSyncState())
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadUserData])

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
      setSyncState(loadSyncState())
      await loadUserData(nextUser.id)
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
      setSyncState(loadSyncState())
      await loadUserData(nextUser.id)
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

  const updateRecurringExpense = async (id, updates) => {
    if (!supabase || !currentUser?.id || !id) {
      return null
    }

    const existing = data.recurringExpenses.find((item) => item.id === id)
    if (!existing) {
      return null
    }

    const merged = { ...existing, ...updates }
    const payload = mapRecurringToSupabase(merged, currentUser.id)
    if (!payload) {
      return null
    }

    try {
      const { data: updated, error } = await supabase
        .from('recurring_expenses')
        .update(payload)
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      const nextRecurring = normalizeSupabaseRecurring(updated)
      if (!nextRecurring) {
        return null
      }

      setData((prev) => ({
        ...prev,
        recurringExpenses: prev.recurringExpenses.map((item) =>
          item.id === id ? nextRecurring : item
        ),
      }))
      setExpensesError(null)
      setSyncState((prev) => ({
        ...prev,
        status: 'Recurring expense updated in cloud',
      }))
      return nextRecurring
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update recurring expense.'
      setExpensesError(message)
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
    updateRecurringExpense,
    removeRecurringExpense,
    syncNow,
    syncStatus: syncState,
    byId,
    isExpensesLoading,
    expensesError,
  }
}
