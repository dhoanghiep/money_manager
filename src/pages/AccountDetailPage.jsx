import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext.jsx'
import { useCurrency } from '../context/CurrencyContext.jsx'
import { api } from '../api/client.js'
import { TransactionList } from '../components/transactions/TransactionList.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { filterByDateRange, sumIncome, sumExpense, sumTransferBalance } from '../utils/aggregations.js'
import { formatCurrency } from '../utils/currencyFormatter.js'
import {
  today, toDateString, getPeriodRange, navigatePeriod,
  formatMonthYear, formatWeekLabel,
} from '../utils/dateHelpers.js'

const PERIODS = [
  { key: 'week',    label: 'Week' },
  { key: 'month',   label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year' },
  { key: 'all',     label: 'All' },
]

function periodLabel(period, refDate) {
  switch (period) {
    case 'week':    return formatWeekLabel(refDate)
    case 'month':   return formatMonthYear(refDate)
    case 'quarter': return `Q${Math.ceil((refDate.getMonth() + 1) / 3)} ${format(refDate, 'yyyy')}`
    case 'year':    return format(refDate, 'yyyy')
    default:        return 'All time'
  }
}

export function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accounts, subAccountsOf, transactions: contextTxns } = useApp()
  const { defaultCurrency } = useCurrency()

  const account = accounts.find(a => a.id === id)
  const subs = account ? subAccountsOf(id) : []

  const [allTxns, setAllTxns] = useState([])
  const [loadingTxns, setLoadingTxns] = useState(true)
  const [period, setPeriod] = useState('month')
  const [refDate, setRefDate] = useState(today())
  const [activeSubId, setActiveSubId] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [multiCurrency, setMultiCurrency] = useState(false)

  useEffect(() => {
    async function load() {
      setLoadingTxns(true)
      try {
        const res = await api.getTransactions()
        setAllTxns(res.data || [])
      } finally {
        setLoadingTxns(false)
      }
    }
    load()
  }, [])

  // Sync edits/adds from AppContext (e.g. after editTransaction) into local allTxns
  useEffect(() => {
    if (contextTxns.length === 0) return
    setAllTxns(prev => prev.map(t => contextTxns.find(c => c.id === t.id) ?? t))
  }, [contextTxns])

  // All transactions for this account
  const accountTxns = useMemo(
    () => allTxns.filter(t => t.accountId === id),
    [allTxns, id]
  )

  // Filtered by active sub-account tab
  const tabTxns = useMemo(
    () => activeSubId === 'all'
      ? accountTxns
      : activeSubId === '__general__'
        ? accountTxns.filter(t => !t.subAccountId)
        : accountTxns.filter(t => (t.subAccountId || '') === activeSubId),
    [accountTxns, activeSubId]
  )

  // Show "General" tab only when there are transactions with no sub-account
  const hasGeneralTxns = useMemo(
    () => accountTxns.some(t => !t.subAccountId),
    [accountTxns]
  )

  // Period-filtered transactions
  const periodTxns = useMemo(() => {
    if (period === 'all') return tabTxns
    const { start, end } = getPeriodRange(period, refDate)
    return filterByDateRange(tabTxns, start, end)
  }, [tabTxns, period, refDate])

  // Current balance = initialBalance + all-time income - expense + transfers (in - out)
  const balance = useMemo(() => {
    const base = activeSubId === 'all' ? (Number(account?.initialBalance) || 0) : 0
    return base + sumIncome(tabTxns) - sumExpense(tabTxns) + sumTransferBalance(tabTxns)
  }, [tabTxns, account, activeSubId])

  const income = useMemo(() => sumIncome(periodTxns), [periodTxns])
  const expense = useMemo(() => sumExpense(periodTxns), [periodTxns])

  // Per-currency raw balances (un-converted) from all-time tabTxns
  const currencyBalances = useMemo(() => {
    const map = {}
    const base = activeSubId === 'all' ? (Number(account?.initialBalance) || 0) : 0
    if (base !== 0) map[defaultCurrency] = (map[defaultCurrency] || 0) + base
    tabTxns.forEach(t => {
      if (t.type === 'transfer') return
      const curr = (t.currency && t.currency !== '') ? t.currency : defaultCurrency
      const amt = Number(t.amount) || 0
      if (t.type === 'income')  map[curr] = (map[curr] || 0) + amt
      if (t.type === 'expense') map[curr] = (map[curr] || 0) - amt
    })
    return Object.entries(map).sort(([ca], [cb]) => {
      if (ca === defaultCurrency) return -1
      if (cb === defaultCurrency) return 1
      return 0
    })
  }, [tabTxns, account, activeSubId, defaultCurrency])

  function navigate_period(dir) {
    if (period === 'all') return
    setRefDate(d => navigatePeriod(period, d, dir))
  }

  if (!account) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl leading-none">‹</button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Account</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">Account not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xl leading-none"
        >‹</button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: account.color + '20' }}
        >
          {account.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{account.name}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{account.type}</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl hover:bg-indigo-700 transition"
        >+</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Balance card */}
        <div
          className="mx-4 mt-4 rounded-2xl px-5 py-4"
          style={{ backgroundColor: account.color + '18', borderColor: account.color + '30', borderWidth: 1 }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium" style={{ color: account.color }}>
              {activeSubId === 'all' ? 'Current Balance'
                : activeSubId === '__general__' ? 'Balance · General'
                : `Balance · ${accounts.find(a => a.id === activeSubId)?.name}`}
            </p>
            <button
              onClick={() => setMultiCurrency(v => !v)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full transition text-white/80 hover:text-white"
              style={{ backgroundColor: account.color + '60' }}
            >
              {multiCurrency ? `⇄ ${defaultCurrency} only` : '⇄ By currency'}
            </button>
          </div>
          {loadingTxns ? (
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 opacity-40">…</p>
          ) : multiCurrency ? (
            <div className="flex flex-col gap-1 mt-1">
              {currencyBalances.map(([curr, amt]) => (
                <div key={curr} className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{curr}</span>
                  <span className={`text-xl font-bold ${amt >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
                    {formatCurrency(Math.abs(amt), curr)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(balance, defaultCurrency)}
            </p>
          )}
        </div>

        {/* Sub-account tabs */}
        {subs.length > 0 && (
          <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => setActiveSubId('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeSubId === 'all'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
            >
              All
            </button>
            {hasGeneralTxns && (
              <button
                onClick={() => setActiveSubId('__general__')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeSubId === '__general__'
                    ? 'bg-gray-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                General
              </button>
            )}
            {subs.map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubId(sub.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeSubId === sub.id
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
                style={activeSubId === sub.id ? { backgroundColor: sub.color || account.color } : {}}
              >
                {sub.icon} {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Period tabs */}
        <div className="flex gap-0.5 mx-4 mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === p.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Period navigation + label */}
        {period !== 'all' && (
          <div className="flex items-center justify-between px-4 mt-2">
            <button
              onClick={() => navigate_period(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >‹</button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {periodLabel(period, refDate)}
            </span>
            <button
              onClick={() => navigate_period(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >›</button>
          </div>
        )}

        {/* Income / Expense summary */}
        <div className="flex gap-3 px-4 mt-3">
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Income</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              +{formatCurrency(income, defaultCurrency)}
            </p>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Expense</p>
            <p className="text-lg font-bold text-red-500 dark:text-red-400">
              -{formatCurrency(expense, defaultCurrency)}
            </p>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Net</p>
            <p className={`text-lg font-bold ${income - expense >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500 dark:text-red-400'}`}>
              {income - expense >= 0 ? '+' : ''}{formatCurrency(income - expense, defaultCurrency)}
            </p>
          </div>
        </div>

        {/* Transaction list */}
        <div className="mt-4 bg-white dark:bg-gray-900 border-t border-b border-gray-100 dark:border-gray-800">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Transactions
              {periodTxns.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">({periodTxns.length})</span>
              )}
            </span>
          </div>
          {loadingTxns ? (
            <PageSpinner />
          ) : periodTxns.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
              No transactions {period !== 'all' ? 'this period' : ''}
            </div>
          ) : (
            <TransactionList
              transactions={[...periodTxns].sort((a, b) => b.date.localeCompare(a.date))}
              showDateHeaders
            />
          )}
        </div>
      </div>

      {/* Add transaction modal pre-filled with this account */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Transaction">
        <TransactionForm
          transaction={{ accountId: id, subAccountId: activeSubId !== 'all' ? activeSubId : '' }}
          onClose={() => {
            setAddOpen(false)
            // Reload all transactions to reflect new entry
            api.getTransactions().then(res => setAllTxns(res.data || []))
          }}
        />
      </Modal>
    </div>
  )
}
