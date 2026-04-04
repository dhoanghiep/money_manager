import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, isValid } from 'date-fns'
import { api } from '../api/client.js'
import { useApp } from '../context/AppContext.jsx'
import { useCurrency } from '../context/CurrencyContext.jsx'
import { Header } from '../components/layout/Header.jsx'
import { PeriodSelector } from '../components/summary/StatCard.jsx'
import { StatPieChart } from '../components/summary/Charts.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import { getPeriodRange, navigatePeriod, formatMonthYear, formatWeekLabel, today } from '../utils/dateHelpers.js'
import {
  getTransactionsForDateRange,
  sumIncome, sumExpense, sumTransferBalance,
  groupByCategory, groupBySubCategory, groupByAccount,
} from '../utils/aggregations.js'
import { formatCurrency } from '../utils/currencyFormatter.js'
import { DrillDownView } from '../components/stats/DrillDownView.jsx'

// ── Group mode toggle ──────────────────────────────────────────

const GROUP_MODES = [
  { key: 'category',    label: 'Category'    },
  { key: 'subcategory', label: 'Sub-category' },
  { key: 'account',     label: 'Account'      },
]

// ── Group list item ────────────────────────────────────────────

function GroupItem({ item, total, currency, onClick }) {
  const pct = total > 0 ? (item.total / total) * 100 : 0
  return (
    <div
      className={`flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 ${onClick ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50' : ''}`}
      onClick={onClick}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: item.color + '22' }}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">
            {formatCurrency(item.total, currency)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.color }} />
        </div>
      </div>
      <div
        className="w-11 text-center text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: item.color + '22', color: item.color }}
      >
        {pct.toFixed(1)}%
      </div>
      {onClick && <span className="text-gray-300 dark:text-gray-600 text-sm flex-shrink-0">›</span>}
    </div>
  )
}

// ── Accounts tab ───────────────────────────────────────────────

function AccountsTab({ currency }) {
  const { accounts, topLevelAccounts, subAccountsOf } = useApp()
  const navigate = useNavigate()
  const [allTxns, setAllTxns] = useState([])
  const [loadingBal, setLoadingBal] = useState(true)
  const [multiCurrency, setMultiCurrency] = useState(false)

  useEffect(() => {
    api.getTransactions()
      .then(res => setAllTxns(res.data || []))
      .finally(() => setLoadingBal(false))
  }, [])

  // Balance for any account/sub (all-time)
  function getBalance(accId, subId = null) {
    const acc = accounts.find(a => a.id === accId)
    const base = subId ? 0 : (Number(acc?.initialBalance) || 0)
    const txns = allTxns.filter(t =>
      t.accountId === accId &&
      (subId ? (t.subAccountId || '') === subId : true)
    )
    return base + sumIncome(txns) - sumExpense(txns) + sumTransferBalance(txns)
  }

  const totalBalance = useMemo(
    () => topLevelAccounts.reduce((s, a) => s + getBalance(a.id), 0),
    [allTxns, topLevelAccounts]
  )

  // Per-currency balances: group raw (un-converted) transaction amounts by currency.
  // Initial balances are treated as default currency.
  const currencyBalances = useMemo(() => {
    const map = {}
    // Initial balances → default currency
    topLevelAccounts.forEach(acc => {
      const base = Number(acc.initialBalance) || 0
      if (base !== 0) map[currency] = (map[currency] || 0) + base
    })
    allTxns.forEach(t => {
      if (t.type === 'transfer') return
      const curr = (t.currency && t.currency !== '') ? t.currency : currency
      const amt = Number(t.amount) || 0
      if (t.type === 'income')  map[curr] = (map[curr] || 0) + amt
      if (t.type === 'expense') map[curr] = (map[curr] || 0) - amt
    })
    // Sort: default currency first, then others descending by abs value
    return Object.entries(map)
      .sort(([ca, va], [cb, vb]) => {
        if (ca === currency) return -1
        if (cb === currency) return 1
        return Math.abs(vb) - Math.abs(va)
      })
  }, [allTxns, topLevelAccounts, currency])

  // Monthly breakdown: group allTxns by YYYY-MM, then by accountId
  const monthlyData = useMemo(() => {
    const map = {}
    allTxns.forEach(t => {
      if (t.type === 'transfer') return          // exclude transfers from activity
      const raw = String(t.date || '')
      const d = raw.length >= 7 ? raw.slice(0, 7) : null
      if (!d) return
      if (!map[d]) map[d] = {}
      if (!map[d][t.accountId]) map[d][t.accountId] = { income: 0, expense: 0 }
      const amt = Number(t.amount) * (Number(t.exchangeRate) || 1)
      if (t.type === 'income')  map[d][t.accountId].income  += amt
      if (t.type === 'expense') map[d][t.accountId].expense += amt
    })
    // Sort months newest first
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, byAcc]) => ({ month, byAcc }))
  }, [allTxns])

  function monthLabel(yyyymm) {
    try {
      const d = parseISO(yyyymm + '-01')
      return isValid(d) ? format(d, 'MMMM yyyy') : yyyymm
    } catch { return yyyymm }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* ── Total balance hero ── */}
      <div className="mx-4 rounded-2xl bg-indigo-600 dark:bg-indigo-700 px-5 py-5 shadow-md">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Total Balance</p>
          <button
            onClick={() => setMultiCurrency(v => !v)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
              multiCurrency
                ? 'bg-white text-indigo-700'
                : 'bg-indigo-500/50 text-indigo-100 hover:bg-indigo-500'
            }`}
          >
            {multiCurrency ? '⇄ By currency' : `${currency} only`}
          </button>
        </div>

        {loadingBal ? (
          <p className="text-2xl font-bold text-white opacity-50">…</p>
        ) : multiCurrency ? (
          /* ── Per-currency view ── */
          <div className="flex flex-col gap-2">
            {currencyBalances.length === 0 ? (
              <p className="text-2xl font-bold text-white opacity-50">—</p>
            ) : currencyBalances.map(([curr, amt]) => (
              <div key={curr} className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-indigo-200 w-10">{curr}</span>
                <span className={`text-2xl font-bold ${amt >= 0 ? 'text-white' : 'text-red-300'}`}>
                  {formatCurrency(amt, curr)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* ── Default currency view ── */
          <p className="text-3xl font-bold text-white">{formatCurrency(totalBalance, currency)}</p>
        )}

        <p className="text-xs text-indigo-300 mt-2">
          {topLevelAccounts.length} account{topLevelAccounts.length !== 1 ? 's' : ''}
          {multiCurrency && currencyBalances.length > 1 && (
            <span> · {currencyBalances.length} currencies</span>
          )}
        </p>
      </div>

      {/* ── Account balance cards ── */}
      <div className="flex flex-col gap-3 mx-4">
        {topLevelAccounts.map(acc => {
          const subs = subAccountsOf(acc.id)
          const accBal = loadingBal ? null : getBalance(acc.id)

          return (
            <div
              key={acc.id}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => navigate(`/accounts/${acc.id}`)}
            >
              {/* Account header + balance */}
              <div
                className="flex items-center gap-3 px-4 py-4"
                style={{ borderLeft: `4px solid ${acc.color}` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: acc.color + '20' }}
                >
                  {acc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{acc.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{acc.type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {accBal === null ? (
                    <span className="text-sm text-gray-300 dark:text-gray-600">…</span>
                  ) : (
                    <span className={`text-base font-bold ${accBal >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
                      {formatCurrency(accBal, currency)}
                    </span>
                  )}
                  <span className="text-gray-300 dark:text-gray-600 text-lg ml-2">›</span>
                </div>
              </div>

              {/* Sub-account balance panels */}
              {subs.length > 0 && (
                <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                  {subs.map(sub => {
                    const subBal = loadingBal ? null : getBalance(acc.id, sub.id)
                    return (
                      <div
                        key={sub.id}
                        className="flex-shrink-0 rounded-xl px-3 py-2 min-w-[110px]"
                        style={{ backgroundColor: (sub.color || acc.color) + '14', border: `1px solid ${(sub.color || acc.color)}30` }}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">{sub.icon}</span>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{sub.name}</span>
                        </div>
                        <p className={`text-sm font-bold ${subBal === null ? 'text-gray-300' : subBal >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-500'}`}>
                          {subBal === null ? '…' : formatCurrency(subBal, currency)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Monthly activity by account ── */}
      {monthlyData.length > 0 && (
        <div className="mx-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            Activity by Month
          </p>
          <div className="flex flex-col gap-3">
            {monthlyData.map(({ month, byAcc }) => (
              <div key={month} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
                {/* Month header */}
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{monthLabel(month)}</span>
                </div>
                {/* Per-account rows */}
                {Object.entries(byAcc).map(([accId, { income, expense }]) => {
                  const acc = accounts.find(a => a.id === accId)
                  if (!acc) return null
                  const net = income - expense
                  return (
                    <div
                      key={accId}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                      onClick={() => navigate(`/accounts/${accId}`)}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: acc.color + '20' }}
                      >
                        {acc.icon}
                      </div>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{acc.name}</span>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        {income > 0 && (
                          <span className="text-green-600 dark:text-green-400 font-medium">↑{formatCurrency(income, currency)}</span>
                        )}
                        {expense > 0 && (
                          <span className="text-red-500 dark:text-red-400 font-medium">↓{formatCurrency(expense, currency)}</span>
                        )}
                        <span className={`font-bold ${net >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-500 dark:text-red-400'}`}>
                          {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stats tab ─────────────────────────────────────────────────

function StatsTab({ currency, onDrillDown }) {
  const { categories, accounts, txRevision } = useApp()
  const [period, setPeriod] = useState('month')
  const [refDate, setRefDate] = useState(today())
  const [txType, setTxType] = useState('expense')
  const [groupMode, setGroupMode] = useState('category')
  const [periodTxns, setPeriodTxns] = useState([])
  const [loading, setLoading] = useState(false)

  const range = useMemo(() => getPeriodRange(period, refDate), [period, refDate])

  // Fetch fresh from API whenever period/refDate changes or a transaction is mutated
  useEffect(() => {
    setLoading(true)
    api.getTransactions(range.start, range.end)
      .then(res => setPeriodTxns(res.data || []))
      .finally(() => setLoading(false))
  }, [range.start, range.end, txRevision])

  const filtered = useMemo(
    () => getTransactionsForDateRange(periodTxns, range.start, range.end),
    [periodTxns, range]
  )

  const inc = useMemo(() => sumIncome(filtered), [filtered])
  const exp = useMemo(() => sumExpense(filtered), [filtered])
  const net = inc - exp

  const typedTxns = useMemo(() => filtered.filter(t => t.type === txType), [filtered, txType])

  const groupData = useMemo(() => {
    if (groupMode === 'category')    return groupByCategory(typedTxns, categories)
    if (groupMode === 'subcategory') return groupBySubCategory(typedTxns, categories)
    return groupByAccount(typedTxns, accounts)
  }, [typedTxns, groupMode, categories, accounts])

  const groupTotal = groupData.reduce((s, d) => s + d.total, 0)

  // For sub-category mode: group items by parent category for hierarchical display
  const subGrouped = useMemo(() => {
    if (groupMode !== 'subcategory') return null
    const parentMap = {}
    groupData.forEach(item => {
      const key = item.categoryId || '__uncategorized__'
      if (!parentMap[key]) {
        const cat = categories.find(c => c.id === key)
        parentMap[key] = {
          key,
          name:  cat ? cat.name  : 'Uncategorized',
          color: cat ? cat.color : '#6B7280',
          icon:  cat ? cat.icon  : '📦',
          total: 0,
          subs:  [],
        }
      }
      parentMap[key].total += item.total
      // Strip the "Parent › " prefix so the list only shows the sub-category name
      const subName = item.name.includes(' › ')
        ? item.name.split(' › ').slice(1).join(' › ')
        : item.name
      parentMap[key].subs.push({ ...item, name: subName })
    })
    return Object.values(parentMap)
      .sort((a, b) => b.total - a.total)
      .map(g => {
        const sorted = g.subs.sort((a, b) => b.total - a.total)
        // Only show sub-items when there's at least one named sub-category.
        // If every transaction in this category is "General" (unassigned),
        // the parent header already conveys the total — no need for a child row.
        const hasRealSubs = sorted.some(s => s.name !== 'General')
        return { ...g, subs: hasRealSubs ? sorted : [] }
      })
  }, [groupMode, groupData, categories])

  // Pie chart data: for sub-category mode, replace "Category › General"-only groups
  // with the parent category item so the chart doesn't show redundant "General" slices.
  const chartData = useMemo(() => {
    if (!subGrouped) return groupData
    return subGrouped.flatMap(group =>
      group.subs.length === 0
        // No real sub-categories: show as a plain parent-level slice (no parentName)
        ? [{ name: group.name, color: group.color, icon: group.icon, total: group.total }]
        // Real sub-categories: add parentName so PieLabel renders the two-line format
        : group.subs.map(sub => ({ ...sub, parentName: group.name }))
    )
  }, [subGrouped, groupData])

  function pLabel() {
    if (period === 'week')    return formatWeekLabel(refDate)
    if (period === 'month')   return formatMonthYear(refDate)
    if (period === 'quarter') return `Q${Math.ceil((refDate.getMonth() + 1) / 3)} ${refDate.getFullYear()}`
    return String(refDate.getFullYear())
  }

  // ── Drill-down helper ────────────────────────────────────────
  function openDrillDown(filter, label, icon, color) {
    onDrillDown({ filter, label, icon, color, txType, initPeriod: period })
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Period bar */}
      <div className="px-4 pt-3 pb-2 flex flex-col gap-2">
        <PeriodSelector period={period} onChange={p => { setPeriod(p); setRefDate(today()) }} />
        <div className="flex items-center justify-between">
          <button onClick={() => setRefDate(d => navigatePeriod(period, d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition text-lg">‹</button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pLabel()}</span>
          <button onClick={() => setRefDate(d => navigatePeriod(period, d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition text-lg">›</button>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <>
          {/* Summary card */}
          <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
              {[
                { label: 'Income',  value: inc, cls: 'text-green-600 dark:text-green-400' },
                { label: 'Expense', value: exp, cls: 'text-red-500  dark:text-red-400'   },
                { label: 'Net',     value: net, cls: net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500 dark:text-red-400' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex flex-col items-center py-3 px-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
                  <span className={`text-sm font-bold leading-tight ${cls}`}>{formatCurrency(value, currency)}</span>
                </div>
              ))}
            </div>

            {/* Expense / Income toggle */}
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
              <StatPieChart data={chartData} />
            </div>
          </div>

          {/* Group mode toggle */}
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

          {/* Breakdown list */}
          <div className="mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm px-4 py-1">
            {groupData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
                <span className="text-3xl">📊</span>
                <span className="text-sm">No {txType} data for this period</span>
              </div>
            ) : subGrouped ? (
              // Sub-category mode: grouped by parent category
              subGrouped.map(group => (
                <div key={group.key}>
                  {group.subs.length === 0 ? (
                    // No real sub-categories — render exactly like a regular GroupItem (with bar + %)
                    <GroupItem
                      item={{ name: group.name, color: group.color, icon: group.icon, total: group.total }}
                      total={groupTotal}
                      currency={currency}
                      onClick={() => openDrillDown(
                        { mode: 'category', categoryId: group.key },
                        group.name, group.icon, group.color
                      )}
                    />
                  ) : (
                    <>
                      {/* Parent category header — clickable */}
                      <div
                        className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50"
                        onClick={() => openDrillDown(
                          { mode: 'category', categoryId: group.key },
                          group.name, group.icon, group.color
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                            style={{ backgroundColor: group.color + '22' }}
                          >
                            {group.icon}
                          </div>
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                            {formatCurrency(group.total, currency)}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600 text-sm">›</span>
                        </div>
                      </div>
                      {/* Sub-category items — indented, each clickable */}
                      {group.subs.map((item, i) => (
                        <div key={i} className="pl-3">
                          <GroupItem
                            item={item}
                            total={groupTotal}
                            currency={currency}
                            onClick={() => openDrillDown(
                              { mode: 'subcategory', categoryId: item.categoryId, subCategoryId: item.subCategoryId || '' },
                              `${group.name} › ${item.name}`, item.icon, item.color
                            )}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))
            ) : (
              groupData.map((item, i) => (
                <GroupItem
                  key={i}
                  item={item}
                  total={groupTotal}
                  currency={currency}
                  onClick={() => openDrillDown(
                    groupMode === 'account'
                      ? { mode: 'account', accountId: item.accountId }
                      : { mode: 'category', categoryId: item.categoryId },
                    item.name, item.icon, item.color
                  )}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function DashboardPage() {
  const { loading } = useApp()
  const { defaultCurrency } = useCurrency()
  const [mainTab, setMainTab] = useState('stats') // 'accounts' | 'stats'
  const [addOpen, setAddOpen] = useState(false)
  const [drillDown, setDrillDown] = useState(null)   // drill-down overlay state

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Hide the normal header/tabs when DrillDown is open */}
      {!drillDown && (
        <Header
          title="Dashboard"
          right={
            <button
              onClick={() => setAddOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl hover:bg-indigo-700 transition"
            >+</button>
          }
        />
      )}

      <div className="flex-1 overflow-y-auto pb-24">

        {drillDown ? (
          /* DrillDownView rendered inside the page scroll — no inner scroller */
          <DrillDownView
            {...drillDown}
            onClose={() => setDrillDown(null)}
          />
        ) : (
          <>
            {/* ── Top-level tab: Accounts / Stats ── */}
            <div className="flex mx-4 mt-4 mb-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
              {[{ key: 'stats', label: '📊 Stats' }, { key: 'accounts', label: '💳 Accounts' }].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMainTab(key)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    mainTab === key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading.accounts ? (
              <PageSpinner />
            ) : mainTab === 'accounts' ? (
              <AccountsTab currency={defaultCurrency} />
            ) : (
              <StatsTab currency={defaultCurrency} onDrillDown={setDrillDown} />
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
