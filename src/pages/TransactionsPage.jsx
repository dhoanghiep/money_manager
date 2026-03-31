import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Header } from '../components/layout/Header.jsx'
import { TransactionList } from '../components/transactions/TransactionList.jsx'
import { TransactionFilters } from '../components/transactions/TransactionFilters.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import { formatCurrency } from '../utils/currencyFormatter.js'
import { sumIncome, sumExpense } from '../utils/aggregations.js'

export function TransactionsPage() {
  const { transactions, loading } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [filters, setFilters] = useState({ type: '', categoryId: '', accountId: '' })
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
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
        {loading.transactions ? (
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
