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

// ── Group mode toggle ──────────────────────────────────────────

const GROUP_MODES = [
  { key: 'category',    label: 'Category'    },
  { key: 'subcategory', label: 'Sub-category' },
  { key: 'account',     label: 'Account'      },
]

// ── Group list item ────────────────────────────────────────────

function GroupItem({ item, total, currency }) {
  const pct = total > 0 ? (item.total / total) * 100 : 0
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
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
    </div>
  )
}

// ── Accounts tab ───────────────────────────────────────────────

function AccountsTab({ currency }) {
  const { accounts, topLevelAccounts, subAccountsOf } = useApp()
  const navigate = useNavigate()
  const [allTxns, setAllTxns] = useState([])
  const [loadingBal, setLoadingBal] = useState(true)

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
        <p className="text-xs font-semibold text-indigo-200 mb-1 uppercase tracking-wide">Total Balance</p>
        {loadingBal ? (
          <p className="text-2xl font-bold text-white opacity-50">…</p>
        ) : (
          <p className="text-3xl font-bold text-white">{formatCurrency(totalBalance, currency)}</p>
        )}
        <p className="text-xs text-indigo-300 mt-1">{topLevelAccounts.length} account{topLevelAccounts.length !== 1 ? 's' : ''}</p>
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

// ── Main page ─────────────────────────────────────────────────

export function DashboardPage() {
  const { transactions, categories, accounts, loading } = useApp()
  const { defaultCurrency } = useCurrency()
  const [mainTab, setMainTab] = useState('stats')   // 'stats' | 'accounts'
  const [period, setPeriod] = useState('month')
  const [refDate, setRefDate] = useState(today())
  const [addOpen, setAddOpen] = useState(false)
  const [txType, setTxType] = useState('expense')
  const [groupMode, setGroupMode] = useState('category')

  const range = getPeriodRange(period, refDate)
  const filtered = getTransactionsForDateRange(transactions, range.start, range.end)

  const inc = sumIncome(filtered)
  const exp = sumExpense(filtered)
  const net = inc - exp

  const typedTxns = filtered.filter(t => t.type === txType)

  let groupData = []
  if (groupMode === 'category')         groupData = groupByCategory(typedTxns, categories)
  else if (groupMode === 'subcategory') groupData = groupBySubCategory(typedTxns, categories)
  else                                  groupData = groupByAccount(typedTxns, accounts)

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
          >+</button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── Top-level tab: Stats / Accounts ── */}
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

        {/* ── Shared: period bar ── */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2">
          <PeriodSelector period={period} onChange={p => { setPeriod(p); setRefDate(today()) }} />
          <div className="flex items-center justify-between">
            <button onClick={() => setRefDate(d => navigatePeriod(period, d, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition text-lg">‹</button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{periodLabel()}</span>
            <button onClick={() => setRefDate(d => navigatePeriod(period, d, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition text-lg">›</button>
          </div>
        </div>

        {loading.transactions ? (
          <PageSpinner />
        ) : mainTab === 'accounts' ? (

          /* ── Accounts tab ── */
          <AccountsTab currency={defaultCurrency} />

        ) : (

          /* ── Stats tab ── */
          <>
            {/* Summary card */}
            <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
                {[
                  { label: 'Income',  value: inc, cls: 'text-green-600 dark:text-green-400' },
                  { label: 'Expense', value: exp, cls: 'text-red-500  dark:text-red-400'   },
                  { label: 'Balance', value: net, cls: net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500 dark:text-red-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex flex-col items-center py-3 px-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
                    <span className={`text-sm font-bold leading-tight ${cls}`}>{formatCurrency(value, defaultCurrency)}</span>
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
                <StatPieChart data={groupData} />
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
              ) : (
                groupData.map((item, i) => (
                  <GroupItem key={i} item={item} total={groupTotal} currency={defaultCurrency} />
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
