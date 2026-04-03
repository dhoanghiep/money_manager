import { useState, useMemo, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext.jsx'
import { Header } from '../components/layout/Header.jsx'
import { TransactionList } from '../components/transactions/TransactionList.jsx'
import { TransactionFilters } from '../components/transactions/TransactionFilters.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import { formatCurrency } from '../utils/currencyFormatter.js'
import { sumIncome, sumExpense } from '../utils/aggregations.js'
import { api } from '../api/client.js'
import { getMonthRange, getWeekRange, getQuarterRange, getYearRange } from '../utils/dateHelpers.js'

export function TransactionsPage() {
  const { categories, accounts, txRevision } = useApp() // Only for filters, not for transactions
  const [addOpen, setAddOpen] = useState(false)
  const [filters, setFilters] = useState({ type: '', categoryId: '', accountId: '' })
  const [search, setSearch] = useState('')

  // Period and date range state (default to current month)
  const today = new Date()
  const [period, setPeriod] = useState('month')
  const [refDate, setRefDate] = useState(today)

  const range = useMemo(() => {
    switch (period) {
      case 'week': return getWeekRange(refDate)
      case 'month': return getMonthRange(refDate)
      case 'quarter': return getQuarterRange(refDate)
      case 'year': return getYearRange(refDate)
      default: return getMonthRange(refDate)
    }
  }, [period, refDate])

  // Transactions loaded from API
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true) // start true — shows spinner on first render
  const [error, setError] = useState('')
  const prevAddOpen = useRef(addOpen)

  async function fetchTransactions(start, end) {
    setLoading(true)
    setError('')
    try {
      const res = await api.getTransactions(start, end)
      setTransactions(res.data || [])
    } catch (err) {
      setError(err.message)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch whenever the period/refDate changes, or when a transaction is mutated elsewhere
  useEffect(() => {
    fetchTransactions(range.start, range.end)
  }, [range.start, range.end, txRevision])

  // Refetch when add modal closes (user may have added a transaction)
  useEffect(() => {
    if (prevAddOpen.current && !addOpen) {
      fetchTransactions(range.start, range.end)
    }
    prevAddOpen.current = addOpen
  }, [addOpen])

  const filtered = useMemo(() => {
    if (!Array.isArray(transactions)) return []
    return transactions.filter(t => {
      if (filters.type && t.type !== filters.type) return false
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false
      if (filters.accountId && t.accountId !== filters.accountId) return false
      if (search && !t.note?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, filters, search])

  const inc = sumIncome(filtered)
  const exp = sumExpense(filtered)

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Transactions"
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl hover:bg-indigo-700 transition"
          >
            +
          </button>
        }
      />

      {/* Period selector */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/30">
        <div className="flex gap-2 justify-center mb-3">
          {['Week', 'Month', 'Quarter', 'Year'].map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p.toLowerCase()); setRefDate(new Date()) }}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
                period === p.toLowerCase()
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Navigation and date display */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const d = new Date(refDate)
              if (period === 'week') d.setDate(d.getDate() - 7)
              else if (period === 'month') d.setMonth(d.getMonth() - 1)
              else if (period === 'quarter') d.setMonth(d.getMonth() - 3)
              else if (period === 'year') d.setFullYear(d.getFullYear() - 1)
              setRefDate(d)
            }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
          >
            ‹
          </button>

          <div className="text-center text-gray-900 dark:text-white font-semibold">
            {period === 'week'
              ? `${format(range.startDate, 'MMM d')} - ${format(range.endDate, 'MMM d, yyyy')}`
              : period === 'month'
              ? format(refDate, 'MMMM yyyy')
              : period === 'quarter'
              ? `Q${Math.ceil((refDate.getMonth() + 1) / 3)} ${refDate.getFullYear()}`
              : refDate.getFullYear().toString()}
          </div>

          <button
            onClick={() => {
              const d = new Date(refDate)
              if (period === 'week') d.setDate(d.getDate() + 7)
              else if (period === 'month') d.setMonth(d.getMonth() + 1)
              else if (period === 'quarter') d.setMonth(d.getMonth() + 3)
              else if (period === 'year') d.setFullYear(d.getFullYear() + 1)
              setRefDate(d)
            }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
          >
            ›
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <input
          type="search"
          placeholder="Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <TransactionFilters filters={filters} onChange={setFilters} />

      {/* Summary strip */}
      <div className="flex gap-4 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">{filtered.length} transactions</span>
        <span className="text-xs text-green-600 dark:text-green-400">+{formatCurrency(inc)}</span>
        <span className="text-xs text-red-500 dark:text-red-400">-{formatCurrency(exp)}</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {error && (
          <div className="m-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {loading ? (
          <PageSpinner />
        ) : (
          <TransactionList transactions={filtered} showDateHeaders transferNeutral />
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Transaction">
        <TransactionForm onClose={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}
