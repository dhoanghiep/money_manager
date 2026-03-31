import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { useCurrency } from '../../context/CurrencyContext.jsx'
import { getPeriodRange, navigatePeriod, formatMonthYear, formatWeekLabel } from '../../utils/dateHelpers.js'
import { sumIncome, sumExpense, sumTransferBalance } from '../../utils/aggregations.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { PeriodSelector } from '../summary/StatCard.jsx'
import { TransactionList } from '../transactions/TransactionList.jsx'
import { PageSpinner } from '../ui/Spinner.jsx'

// Generate N period ranges going back from today
function getLastNPeriods(period, n) {
  const ranges = []
  let d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    let ref = d
    for (let j = 0; j < i; j++) ref = navigatePeriod(period, ref, -1)
    ranges.push(getPeriodRange(period, ref))
  }
  return ranges
}

function periodLabel(period, range) {
  const d = new Date(range.start + 'T12:00:00')
  if (period === 'week')    return formatWeekLabel(d)
  if (period === 'month')   return formatMonthYear(d)
  if (period === 'quarter') return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`
  return String(d.getFullYear())
}

function kFmt(v) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

export function DrillDownView({ filter, label, icon, color, txType, initPeriod = 'month', onClose }) {
  const { accounts } = useApp()
  const { defaultCurrency: currency } = useCurrency()

  const [period, setPeriod]   = useState(initPeriod)
  const [nPeriods, setNPeriods] = useState(10)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const isAccount = filter.mode === 'account' || filter.mode === 'subaccount'

  // Build period ranges
  const periods = useMemo(() => getLastNPeriods(period, nPeriods), [period, nPeriods])
  const fullStart = periods[0]?.start
  const fullEnd   = periods[periods.length - 1]?.end

  // Fetch transactions: accounts need all-time for running balance; categories need range only
  useEffect(() => {
    setLoading(true)
    const startDate = isAccount ? undefined : fullStart
    const endDate   = isAccount ? undefined : fullEnd
    api.getTransactions(startDate, endDate)
      .then(res => setTransactions(res.data || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [fullStart, fullEnd, isAccount])

  // Filter transactions to the selected category/account
  const filtered = useMemo(() => transactions.filter(t => {
    if (filter.accountId    && t.accountId    !== filter.accountId)    return false
    if (filter.subAccountId && (t.subAccountId || '') !== filter.subAccountId) return false
    if (filter.categoryId   && t.categoryId   !== filter.categoryId)   return false
    if (filter.subCategoryId && (t.subCategoryId || '') !== filter.subCategoryId) return false
    return true
  }), [transactions, filter])

  // Transactions inside the visible period range (for list + total)
  const visibleTxns = useMemo(() => filtered.filter(t => t.date >= fullStart && t.date <= fullEnd), [filtered, fullStart, fullEnd])

  // Chart data per period
  const chartData = useMemo(() => {
    if (isAccount) {
      // Running balance for account
      const acc    = accounts.find(a => a.id === filter.accountId)
      let balance  = Number(acc?.initialBalance) || 0
      // Add everything before the first visible period
      const before = filtered.filter(t => t.date < fullStart)
      balance += sumIncome(before) - sumExpense(before) + sumTransferBalance(before)

      return periods.map(p => {
        const txns = filtered.filter(t => t.date >= p.start && t.date <= p.end)
        balance += sumIncome(txns) - sumExpense(txns) + sumTransferBalance(txns)
        return { label: periodLabel(period, p), balance: +balance.toFixed(2) }
      })
    }

    return periods.map(p => {
      const txns = filtered.filter(t => t.date >= p.start && t.date <= p.end)
      return {
        label:   periodLabel(period, p),
        income:  +sumIncome(txns).toFixed(2),
        expense: +sumExpense(txns).toFixed(2),
      }
    })
  }, [periods, filtered, period, isAccount, accounts, filter, fullStart])

  const total = useMemo(() => {
    if (isAccount) {
      const acc = accounts.find(a => a.id === filter.accountId)
      const base = Number(acc?.initialBalance) || 0
      return base + sumIncome(filtered) - sumExpense(filtered) + sumTransferBalance(filtered)
    }
    return txType === 'expense' ? sumExpense(visibleTxns) : sumIncome(visibleTxns)
  }, [filtered, visibleTxns, isAccount, txType, accounts, filter])

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg"
        >
          ←
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: color + '22' }}>
          {icon}
        </div>
        <span className="font-bold text-gray-900 dark:text-white truncate flex-1">{label}</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Period selector */}
        <div className="px-4 pt-3 pb-1 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <PeriodSelector period={period} onChange={setPeriod} />

          {/* N periods control */}
          <div className="flex items-center justify-between mt-2 pb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Show last</span>
            <div className="flex items-center gap-2">
              {[5, 10, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setNPeriods(n)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                    nPeriods === n
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-gray-500 dark:text-gray-400">{period}s</span>
            </div>
          </div>
        </div>

        {loading ? <PageSpinner /> : (
          <>
            {/* Total card */}
            <div className="mx-4 mt-4 mb-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                {isAccount ? 'Current Balance' : txType === 'expense' ? 'Total Expense' : 'Total Income'}
              </div>
              <div className={`text-2xl font-bold ${
                isAccount
                  ? total >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'
                  : txType === 'expense'
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {isAccount && total >= 0 ? '' : isAccount ? '-' : ''}
                {formatCurrency(Math.abs(total), currency)}
              </div>
            </div>

            {/* Line chart */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={kFmt}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v, name) => [formatCurrency(v, currency), name]}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                  />
                  {isAccount ? (
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="Balance"
                      stroke={color || '#6366f1'}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color || '#6366f1' }}
                      activeDot={{ r: 5 }}
                    />
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#22c55e' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Expense"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#ef4444' }}
                        activeDot={{ r: 5 }}
                      />
                    </>
                  )}
                  {!isAccount && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Transactions for the visible range */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Transactions
              </div>
              <TransactionList transactions={visibleTxns} showDateHeaders transferNeutral />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
