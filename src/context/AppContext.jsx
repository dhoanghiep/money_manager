import { createContext, useCallback, useContext, useEffect, useReducer } from 'react'
import { api } from '../api/client.js'
import { getMonthRange } from '../utils/dateHelpers.js'

// ── State shape ───────────────────────────────────────────────
const initialState = {
  transactions: [],       // all loaded transactions
  categories: [],
  accounts: [],
  schedules: [],
  loading: { transactions: false, categories: false, accounts: false, schedules: false },
  error: null,
}

// ── Reducer ───────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, ...action.payload } }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload }
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload }
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.payload }
    case 'ADD_SCHEDULE':
      return { ...state, schedules: [...state.schedules, action.payload] }
    case 'UPDATE_SCHEDULE':
      return { ...state, schedules: state.schedules.map(s => s.id === action.payload.id ? action.payload : s) }
    case 'REMOVE_SCHEDULE':
      return { ...state, schedules: state.schedules.filter(s => s.id !== action.payload) }
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload }
    case 'ADD_TRANSACTIONS':
      // Merge without duplicates
      return {
        ...state,
        transactions: [
          ...state.transactions.filter(t => !action.payload.find(n => n.id === t.id)),
          ...action.payload,
        ],
      }
    case 'UPSERT_TRANSACTION': {
      const exists = state.transactions.find(t => t.id === action.payload.id)
      return {
        ...state,
        transactions: exists
          ? state.transactions.map(t => t.id === action.payload.id ? action.payload : t)
          : [action.payload, ...state.transactions],
      }
    }
    case 'UPDATE_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.data } : t
        ),
      }
    }
    case 'REMOVE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) }
    case 'REMOVE_TRANSFER':
      return { ...state, transactions: state.transactions.filter(t => t.transferId !== action.payload) }
    case 'UPDATE_TRANSFER': {
      const { transferId, data } = action.payload
      return {
        ...state,
        transactions: state.transactions.map(t => {
          if (t.transferId !== transferId) return t
          const isOutflow = t.fromAccountId && t.accountId === t.fromAccountId
          return {
            ...t,
            date:          data.date          ?? t.date,
            amount:        data.amount        ?? t.amount,
            note:          data.note          ?? t.note,
            currency:      data.currency      ?? t.currency,
            exchangeRate:  data.exchangeRate  ?? t.exchangeRate,
            fromAccountId: data.fromAccountId ?? t.fromAccountId,
            toAccountId:   data.toAccountId   ?? t.toAccountId,
            accountId:     isOutflow ? (data.fromAccountId ?? t.accountId) : (data.toAccountId ?? t.accountId),
            subAccountId:  isOutflow ? (data.fromSubAccountId ?? t.subAccountId) : (data.toSubAccountId ?? t.subAccountId),
            updatedAt:     new Date().toISOString(),
          }
        }),
      }
    }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'REMOVE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.payload) }
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] }
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) }
    case 'REMOVE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) }
    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load categories and accounts once on mount
  useEffect(() => {
    loadPreferences()
    loadCategories()
    loadAccounts()
    loadSchedules()
    applyDueSchedulesOnLoad()
    const { start, end } = getMonthRange(new Date())
    loadTransactions(start, end)
  }, [])

  async function loadPreferences() {
    try {
      const res = await api.getPreferences()
      const prefs = res.data || []
      prefs.forEach(({ key, value }) => {
        if (key && value !== undefined && value !== null && value !== '') {
          localStorage.setItem(key, String(value))
        }
      })
    } catch (e) {
      console.warn('Could not load preferences from DB:', e.message)
    }
  }

  async function loadCategories() {
    dispatch({ type: 'SET_LOADING', payload: { categories: true } })
    try {
      const res = await api.getCategories()
      dispatch({ type: 'SET_CATEGORIES', payload: res.data || [] })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { categories: false } })
    }
  }

  async function loadSchedules() {
    dispatch({ type: 'SET_LOADING', payload: { schedules: true } })
    try {
      const res = await api.getSchedules()
      dispatch({ type: 'SET_SCHEDULES', payload: res.data || [] })
    } catch (e) {
      console.warn('Failed to load schedules:', e.message)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { schedules: false } })
    }
  }

  // Runs on mount — GAS checks all active schedules and creates any overdue transactions
  async function applyDueSchedulesOnLoad() {
    try {
      const res = await api.applyDueSchedules()
      if (res.applied && res.applied.length > 0) {
        // Reload transactions so the new ones appear
        const { start, end } = getMonthRange(new Date())
        loadTransactions(start, end)
        loadSchedules() // refresh nextDate values
      }
    } catch (e) {
      console.warn('applyDueSchedules failed:', e.message)
    }
  }

  async function loadAccounts() {
    dispatch({ type: 'SET_LOADING', payload: { accounts: true } })
    try {
      const res = await api.getAccounts()
      dispatch({ type: 'SET_ACCOUNTS', payload: res.data || [] })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { accounts: false } })
    }
  }

  const loadTransactions = useCallback(async (startDate, endDate) => {
    dispatch({ type: 'SET_LOADING', payload: { transactions: true } })
    try {
      const res = await api.getTransactions(startDate, endDate)
      dispatch({ type: 'ADD_TRANSACTIONS', payload: res.data || [] })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { transactions: false } })
    }
  }, [])

  async function addTransaction(data) {
    const res = await api.addTransaction(data)
    const newTxn = { ...data, id: res.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPSERT_TRANSACTION', payload: newTxn })
    return newTxn
  }

  async function editTransaction(id, data) {
    await api.updateTransaction(id, data)
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, data: { ...data, updatedAt: new Date().toISOString() } } })
  }

  async function removeTransaction(id) {
    await api.deleteTransaction(id)
    dispatch({ type: 'REMOVE_TRANSACTION', payload: id })
  }

  async function addTransfer(data) {
    const res = await api.addTransfer(data)
    const now = new Date().toISOString()
    const base = { date: data.date, amount: data.amount, type: 'transfer', note: data.note || '',
      currency: data.currency, exchangeRate: data.exchangeRate || 1,
      transferId: res.transferId, fromAccountId: data.fromAccountId, toAccountId: data.toAccountId,
      createdAt: now, updatedAt: now }
    dispatch({ type: 'UPSERT_TRANSACTION', payload: { ...base, id: res.idOut, accountId: data.fromAccountId, subAccountId: data.fromSubAccountId || '' } })
    dispatch({ type: 'UPSERT_TRANSACTION', payload: { ...base, id: res.idIn,  accountId: data.toAccountId,  subAccountId: data.toSubAccountId   || '' } })
    return res
  }

  async function editTransfer(transferId, data) {
    await api.updateTransfer(transferId, data)
    dispatch({ type: 'UPDATE_TRANSFER', payload: { transferId, data } })
  }

  async function removeTransfer(transferId) {
    await api.deleteTransfer(transferId)
    dispatch({ type: 'REMOVE_TRANSFER', payload: transferId })
  }

  async function addCategory(data) {
    const res = await api.addCategory(data)
    const newCat = { ...data, id: res.id, isDefault: false }
    dispatch({ type: 'ADD_CATEGORY', payload: newCat })
    return newCat
  }

  async function editCategory(id, data) {
    await api.updateCategory(id, data)
    const updated = { ...state.categories.find(c => c.id === id), ...data }
    dispatch({ type: 'UPDATE_CATEGORY', payload: updated })
    return updated
  }

  async function removeCategory(id) {
    await api.deleteCategory(id)
    dispatch({ type: 'REMOVE_CATEGORY', payload: id })
  }

  async function reorderCategories(orderedIds) {
    // Optimistic update first
    const ordered = orderedIds.map(id => state.categories.find(c => c.id === id)).filter(Boolean)
    dispatch({ type: 'SET_CATEGORIES', payload: ordered })
    await api.reorderCategories(orderedIds)
  }

  async function addSchedule(data) {
    const res = await api.addSchedule(data)
    const newSch = { ...data, id: res.id, isActive: true, nextDate: data.startDate, createdAt: new Date().toISOString() }
    dispatch({ type: 'ADD_SCHEDULE', payload: newSch })
    // Apply immediately in case the start date is today or in the past
    applyDueSchedulesOnLoad()
    return newSch
  }

  async function editSchedule(id, data) {
    await api.updateSchedule(id, data)
    const updated = { ...state.schedules.find(s => s.id === id), ...data }
    dispatch({ type: 'UPDATE_SCHEDULE', payload: updated })
    return updated
  }

  async function removeSchedule(id, deleteTxns = false) {
    await api.deleteSchedule(id, deleteTxns)
    dispatch({ type: 'REMOVE_SCHEDULE', payload: id })
    // If transactions were also deleted, reload the current month view
    if (deleteTxns) {
      const { start, end } = getMonthRange(new Date())
      loadTransactions(start, end)
    }
  }

  async function addAccount(data) {
    const res = await api.addAccount(data)
    const newAcc = { ...data, id: res.id, isDefault: false }
    dispatch({ type: 'ADD_ACCOUNT', payload: newAcc })
    return newAcc
  }

  async function editAccount(id, data) {
    await api.updateAccount(id, data)
    const updated = { ...state.accounts.find(a => a.id === id), ...data }
    dispatch({ type: 'UPDATE_ACCOUNT', payload: updated })
    return updated
  }

  async function removeAccount(id) {
    await api.deleteAccount(id)
    dispatch({ type: 'REMOVE_ACCOUNT', payload: id })
  }

  // Derived: top-level categories / sub-categories
  const topLevelCategories = state.categories.filter(c => !c.parentId)
  const subCategoriesOf = (parentId) => state.categories.filter(c => c.parentId === parentId)

  // Derived: top-level accounts / sub-accounts
  const topLevelAccounts = state.accounts.filter(a => !a.parentId)
  const subAccountsOf = (parentId) => state.accounts.filter(a => a.parentId === parentId)

  const value = {
    ...state,
    topLevelCategories,
    subCategoriesOf,
    topLevelAccounts,
    subAccountsOf,
    loadTransactions,
    loadCategories,
    loadAccounts,
    loadSchedules,
    addSchedule,
    editSchedule,
    removeSchedule,
    addTransaction,
    editTransaction,
    removeTransaction,
    addTransfer,
    editTransfer,
    removeTransfer,
    addCategory,
    editCategory,
    removeCategory,
    reorderCategories,
    addAccount,
    editAccount,
    removeAccount,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
