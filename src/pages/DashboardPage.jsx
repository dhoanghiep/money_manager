import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Header } from '../components/layout/Header.jsx'
import { StatCard, PeriodSelector } from '../components/summary/StatCard.jsx'
import { CategoryPieChart, TrendBarChart } from '../components/summary/Charts.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import { getPeriodRange, navigatePeriod, formatMonthYear, formatWeekLabel, today } from '../utils/dateHelpers.js'
import { getTransactionsForDateRange, sumIncome, sumExpense, netBalance } from '../utils/aggregations.js'
import { format } from 'date-fns'

export function DashboardPage() {
  const { transactions, categories, loading } = useApp()
  const [period, setPeriod] = useState('month')
  const [refDate, setRefDate] = useState(today())
  const [addOpen, setAddOpen] = useState(false)

  const range = getPeriodRange(period, refDate)
  const filtered = getTransactionsForDateRange(transactions, range.start, range.end)

  const inc = sumIncome(filtered)
  const exp = sumExpense(filtered)
  const net = netBalance(filtered)

  function periodLabel() {
    if (period === 'week') return formatWeekLabel(refDate)
    if (period === 'month') return formatMonthYear(refDate)
    if (period === 'quarter') return `Q${Math.ceil((refDate.getMonth() + 1) / 3)} ${refDate.getFullYear()}`
    return String(refDate.getFullYear())
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Dashboard"
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl hover:bg-indigo-700 transition"
          >
            +
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4 flex flex-col gap-4">
        {/* Period selector */}
        <PeriodSelector period={period} onChange={p => { setPeriod(p); setRefDate(today()) }} />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRefDate(d => navigatePeriod(period, d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{periodLabel()}</span>
          <button
            onClick={() => setRefDate(d => navigatePeriod(period, d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ›
          </button>
        </div>

        {loading.transactions ? (
          <PageSpinner />
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Income"  amount={inc} type="income"  icon="↑" />
              <StatCard label="Expense" amount={exp} type="expense" icon="↓" />
              <StatCard label="Balance" amount={net} type={net >= 0 ? 'net' : 'expense'} icon="=" />
            </div>

            {/* Trend bar chart */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Income vs Expense</h3>
              <TrendBarChart transactions={filtered} startDate={range.start} endDate={range.end} />
            </div>

            {/* Category breakdown */}
            {exp > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Expenses by Category</h3>
                <CategoryPieChart transactions={filtered} categories={categories} />
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Transaction">
        <TransactionForm onClose={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}
