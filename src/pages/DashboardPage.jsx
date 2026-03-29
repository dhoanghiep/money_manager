import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Header } from '../components/layout/Header.jsx'
import { PeriodSelector } from '../components/summary/StatCard.jsx'
import { StatPieChart } from '../components/summary/Charts.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import { getPeriodRange, navigatePeriod, formatMonthYear, formatWeekLabel, today } from '../utils/dateHelpers.js'
import {
  getTransactionsForDateRange,
  sumIncome, sumExpense,
  groupByCategory, groupBySubCategory, groupByAccount,
} from '../utils/aggregations.js'
import { formatCurrency } from '../utils/currencyFormatter.js'

// ── Group mode toggle ──────────────────────────────────────────

const GROUP_MODES = [
  { key: 'category',    label: 'Category'    },
  { key: 'subcategory', label: 'Sub-category' },
  { key: 'account',     label: 'Account'      },
]

// ── Stat row ──────────────────────────────────────────────────

function StatRow({ label, amount, colorClass }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{formatCurrency(amount)}</span>
    </div>
  )
}

// ── Category list item ────────────────────────────────────────

function GroupItem({ item, total }) {
  const pct = total > 0 ? (item.total / total) * 100 : 0
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: item.color + '22' }}
      >
        {item.icon}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">
            {formatCurrency(item.total)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: item.color }}
          />
        </div>
      </div>

      {/* Pct badge */}
      <div
        className="w-11 text-center text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: item.color + '22', color: item.color }}
      >
        {pct.toFixed(1)}%
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function DashboardPage() {
  const { transactions, categories, accounts, loading } = useApp()
  const [period, setPeriod] = useState('month')
  const [refDate, setRefDate] = useState(today())
  const [addOpen, setAddOpen] = useState(false)
  const [txType, setTxType] = useState('expense') // expense | income
  const [groupMode, setGroupMode] = useState('category')

  const range = getPeriodRange(period, refDate)
  const filtered = getTransactionsForDateRange(transactions, range.start, range.end)

  const inc = sumIncome(filtered)
  const exp = sumExpense(filtered)
  const net = inc - exp

  // Transactions for the active type tab
  const typedTxns = filtered.filter(t => t.type === txType)

  // Build chart data based on group mode
  let groupData = []
  if (groupMode === 'category') {
    groupData = groupByCategory(typedTxns, categories)
  } else if (groupMode === 'subcategory') {
    groupData = groupBySubCategory(typedTxns, categories)
  } else {
    groupData = groupByAccount(typedTxns, accounts)
  }

  const groupTotal = groupData.reduce((s, d) => s + d.total, 0)

  function periodLabel() {
    if (period === 'week')    return formatWeekLabel(refDate)
    if (period === 'month')   return formatMonthYear(refDate)
    if (period === 'quarter') return `Q${Math.ceil((refDate.getMonth() + 1) / 3)} ${refDate.getFullYear()}`
    return String(refDate.getFullYear())
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
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

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── Period bar ── */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-3">
          <PeriodSelector period={period} onChange={p => { setPeriod(p); setRefDate(today()) }} />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setRefDate(d => navigatePeriod(period, d, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition text-lg"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{periodLabel()}</span>
            <button
              onClick={() => setRefDate(d => navigatePeriod(period, d, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition text-lg"
            >
              ›
            </button>
          </div>
        </div>

        {loading.transactions ? (
          <PageSpinner />
        ) : (
          <>
            {/* ── Summary card ── */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
              {/* Income / Expense / Balance totals */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
                {[
                  { label: 'Income',  value: inc, cls: 'text-green-600 dark:text-green-400' },
                  { label: 'Expense', value: exp, cls: 'text-red-500  dark:text-red-400'   },
                  { label: 'Balance', value: net, cls: net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500 dark:text-red-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex flex-col items-center py-3 px-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
                    <span className={`text-sm font-bold leading-tight ${cls}`}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>

              {/* Type toggle: Expense / Income */}
              <div className="flex border-t border-gray-100 dark:border-gray-800">
                {['expense', 'income'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTxType(t)}
                    className={`flex-1 py-2 text-xs font-semibold transition ${
                      txType === t
                        ? t === 'income'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </button>
                ))}
              </div>

              {/* Pie chart */}
              <div className="pt-2 pb-1">
                <StatPieChart data={groupData} />
              </div>
            </div>

            {/* ── Group mode toggle ── */}
            <div className="mx-4 mb-3 flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              {GROUP_MODES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGroupMode(key)}
                  className={`flex-1 py-2 text-xs font-semibold transition ${
                    groupMode === key
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Breakdown list ── */}
            <div className="mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm px-4 py-1">
              {groupData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
                  <span className="text-3xl">📊</span>
                  <span className="text-sm">No {txType} data for this period</span>
                </div>
              ) : (
                groupData.map((item, i) => (
                  <GroupItem key={i} item={item} total={groupTotal} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Transaction">
        <TransactionForm onClose={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}
