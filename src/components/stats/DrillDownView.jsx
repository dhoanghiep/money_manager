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

// Build N period ranges ending at refDate (oldest first)
function buildPeriods(period, n, refDate) {
  const ranges = []
  let d = refDate
  for (let i = 0; i < n; i++) {
    ranges.unshift(getPeriodRange(period, d))
    d = navigatePeriod(period, d, -1)
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

function navLabel(period, refDate) {
  if (period === 'week')    return formatWeekLabel(refDate)
  if (period === 'month')   return formatMonthYear(refDate)
  if (period === 'quarter') return `Q${Math.ceil((refDate.getMonth() + 1) / 3)} ${refDate.getFullYear()}`
  return String(refDate.getFullYear())
}

function kFmt(v) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

// Checkbox row for metric toggle
function MetricRow({ checked, onChange, label, value, color, currency }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition"
        style={{
          backgroundColor: checked ? color : 'transparent',
          borderColor: color,
        }}
        onClick={onChange}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{formatCurrency(value, currency)}</span>
    </label>
  )
}

// DrillDownView — rendered inside DashboardPage's overflow-y-auto div (no inner scroller)
export function DrillDownView({ filter, label, icon, color, txType, initPeriod = 'month', onClose }) {
  const { accounts } = useApp()
  const { defaultCurrency: currency } = useCurrency()

  const [period, setPeriod]     = useState(initPeriod)
  const [refDate, setRefDate]   = useState(new Date())
  const [nPeriods, setNPeriods] = useState(10)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]   = useState(true)

  // Which lines to show in chart (non-account only)
  const [showExpense, setShowExpense] = useState(true)
  const [showIncome, setShowIncome]   = useState(true)

  const isAccount = filter.mode === 'account' || filter.mode === 'subaccount'

  // Selected period range
  const selectedRange = useMemo(() => getPeriodRange(period, refDate), [period, refDate])

  // N periods ending at refDate (for chart)
  const periods = useMemo(() => buildPeriods(period, nPeriods, refDate), [period, nPeriods, refDate])
  const chartStart = periods[0]?.start
  const chartEnd   = periods[periods.length - 1]?.end

  // Fetch: accounts need all history for running balance; categories only need chart range
  useEffect(() => {
    setLoading(true)
    const start = isAccount ? undefined : chartStart
    const end   = isAccount ? undefined : chartEnd
    api.getTransactions(start, end)
      .then(res => setTransactions(res.data || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [chartStart, chartEnd, isAccount])

  // Filter transactions to this category/account
  const filtered = useMemo(() => transactions.filter(t => {
    if (filter.accountId     && t.accountId    !== filter.accountId)    return false
    if (filter.subAccountId  && (t.subAccountId || '') !== filter.subAccountId)  return false
    if (filter.categoryId    && t.categoryId   !== filter.categoryId)   return false
    if (filter.subCategoryId && (t.subCategoryId || '') !== filter.subCategoryId) return false
    return true
  }), [transactions, filter])

  // Transactions for the selected period only
  const selectedTxns = useMemo(
    () => filtered.filter(t => t.date >= selectedRange.start && t.date <= selectedRange.end),
    [filtered, selectedRange]
  )

  // Transactions to show in list (filtered by checkbox selection for non-account)
  const visibleTxns = useMemo(() => {
    if (isAccount) return selectedTxns
    return selectedTxns.filter(t => {
      if (t.type === 'expense') return showExpense
      if (t.type === 'income')  return showIncome
      return true // transfers etc.
    })
  }, [selectedTxns, isAccount, showExpense, showIncome])

  // Chart data: N periods ending at refDate
  const chartData = useMemo(() => {
    if (isAccount) {
      const acc    = accounts.find(a => a.id === filter.accountId)
      let balance  = Number(acc?.initialBalance) || 0
      filtered.filter(t => t.date < chartStart).forEach(t => {
        balance += sumIncome([t]) - sumExpense([t]) + sumTransferBalance([t])
      })
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
  }, [periods, filtered, period, isAccount, accounts, filter, chartStart])

  // Metrics for selected period
  const selIncome  = useMemo(() => sumIncome(selectedTxns),  [selectedTxns])
  const selExpense = useMemo(() => sumExpense(selectedTxns), [selectedTxns])
  const selNet     = selIncome - selExpense

  // Account balance at end of selected period = last point in chartData
  const selBalance = useMemo(
    () => chartData[chartData.length - 1]?.balance ?? 0,
    [chartData]
  )

  const metricLabel = isAccount
    ? `Balance · ${navLabel(period, refDate)}`
    : `${navLabel(period, refDate)}`

  return (
    // No overflow — uses parent's overflow-y-auto scroll
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 min-h-full">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xl"
        >
          ←
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: color + '22' }}>
          {icon}
        </div>
        <span className="font-bold text-gray-900 dark:text-white truncate flex-1">{label}</span>
      </div>

      {/* Controls bar */}
      <div className="px-4 pt-3 pb-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-2">
        {/* Period type */}
        <PeriodSelector period={period} onChange={p => { setPeriod(p); setRefDate(new Date()) }} />

        {/* Period navigator */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRefDate(d => navigatePeriod(period, d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg"
          >‹</button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {navLabel(period, refDate)}
          </span>
          <button
            onClick={() => setRefDate(d => navigatePeriod(period, d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg"
          >›</button>
        </div>

        {/* Chart history selector */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Chart history</span>
          <div className="flex items-center gap-1.5">
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
            <span className="text-xs text-gray-400 dark:text-gray-500">{period}s</span>
          </div>
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <>
          {/* ── Metric card ── */}
          <div className="mx-4 mt-4 mb-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">{metricLabel}</div>

            {isAccount ? (
              /* Account: single balance */
              <div className={`text-2xl font-bold ${
                selBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 dark:text-red-400'
              }`}>
                {formatCurrency(Math.abs(selBalance), currency)}
              </div>
            ) : (
              /* Category: expense + income + net with toggles */
              <div className="flex flex-col gap-2.5">
                <MetricRow
                  checked={showExpense}
                  onChange={() => setShowExpense(v => !v)}
                  label="Expense"
                  value={selExpense}
                  color="#ef4444"
                  currency={currency}
                />
                <MetricRow
                  checked={showIncome}
                  onChange={() => setShowIncome(v => !v)}
                  label="Income"
                  value={selIncome}
                  color="#22c55e"
                  currency={currency}
                />
                {/* Net — always shown, not toggleable */}
                <div className="flex items-center gap-3 pt-1 mt-0.5 border-t border-gray-100 dark:border-gray-800">
                  <span className="w-4 flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Net</span>
                  <span className={`text-sm font-bold ${
                    selNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'
                  }`}>
                    {selNet >= 0 ? '+' : ''}{formatCurrency(selNet, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Line chart ── */}
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
                  <Line type="monotone" dataKey="balance" name="Balance"
                    stroke={color || '#6366f1'} strokeWidth={2.5}
                    dot={{ r: 3, fill: color || '#6366f1' }} activeDot={{ r: 5 }} />
                ) : (
                  <>
                    {showIncome && (
                      <Line type="monotone" dataKey="income" name="Income"
                        stroke="#22c55e" strokeWidth={2}
                        dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
                    )}
                    {showExpense && (
                      <Line type="monotone" dataKey="expense" name="Expense"
                        stroke="#ef4444" strokeWidth={2}
                        dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                    )}
                  </>
                )}
                {!isAccount && (showIncome || showExpense) && (
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Transaction list ── */}
          <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {navLabel(period, refDate)} — {visibleTxns.length} transactions
            </div>
            <TransactionList transactions={visibleTxns} showDateHeaders transferNeutral />
          </div>
        </>
      )}
    </div>
  )
}
