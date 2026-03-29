import { createContext, useCallback, useContext, useEffect, useReducer } from 'react'
import { api } from '../api/client.js'
import { getMonthRange } from '../utils/dateHelpers.js'

// ── State shape ───────────────────────────────────────────────
const initialState = {
  transactions: [],       // all loaded transactions
  categories: [],
  accounts: [],
  loading: { transactions: false, categories: false, accounts: false },
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
    case 'REMOVE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) }
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
    loadCategories()
    loadAccounts()
    const { start, end } = getMonthRange(new Date())
    loadTransactions(start, end)
  }, [])

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
    const updated = { ...state.transactions.find(t => t.id === id), ...data, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPSERT_TRANSACTION', payload: updated })
    return updated
  }

  async function removeTransaction(id) {
    await api.deleteTransaction(id)
    dispatch({ type: 'REMOVE_TRANSACTION', payload: id })
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

  const value = {
    ...state,
    loadTransactions,
    loadCategories,
    loadAccounts,
    addTransaction,
    editTransaction,
    removeTransaction,
    addCategory,
    editCategory,
    removeCategory,
    addAccount,
    editAccount,
    removeAccount,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
