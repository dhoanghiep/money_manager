import { useState, useEffect } from 'react'
import { TransactionItem } from './TransactionItem.jsx'
import { groupByDate } from '../../utils/aggregations.js'
import { formatDisplay } from '../../utils/dateHelpers.js'
import { EmptyState } from '../ui/EmptyState.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { sumIncome, sumExpense } from '../../utils/aggregations.js'

const PAGE_SIZE = 50

// For each transferId keep only one row (prefer outflow leg → shows "To X").
function dedupeTransfers(txns) {
  const seen = new Map() // transferId → index in out[]
  const out = []
  for (const t of txns) {
    if (!t.transferId) { out.push(t); continue }
    if (!seen.has(t.transferId)) {
      seen.set(t.transferId, out.length)
      out.push(t)
    } else {
      const isOutflow = t.fromAccountId && t.accountId === t.fromAccountId
      if (isOutflow) out[seen.get(t.transferId)] = t
    }
  }
  return out
}

function ShowMoreButton({ shown, total, onMore }) {
  const remaining = total - shown
  if (remaining <= 0) return null
  return (
    <button
      onClick={onMore}
      className="w-full py-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
    >
      Show {Math.min(remaining, PAGE_SIZE)} more <span className="text-gray-400 dark:text-gray-500">({remaining} remaining)</span>
    </button>
  )
}

export function TransactionList({ transactions, showDateHeaders = true, transferNeutral = false }) {
  const [page, setPage] = useState(1)

  // Reset to first page whenever the transactions list changes
  useEffect(() => { setPage(1) }, [transactions])

  if (!transactions || transactions.length === 0) {
    return <EmptyState icon="💸" title="No transactions" description="Tap + to add your first transaction" />
  }

  const deduped = dedupeTransfers(transactions)
  const limit   = page * PAGE_SIZE
  const visible = deduped.slice(0, limit)

  if (!showDateHeaders) {
    return (
      <div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {visible.map(t => (
            <TransactionItem key={t.id} transaction={t} showDate transferNeutral={transferNeutral} />
          ))}
        </div>
        <ShowMoreButton shown={visible.length} total={deduped.length} onMore={() => setPage(p => p + 1)} />
      </div>
    )
  }

  // For date-grouped view, slice by grouped days to keep date headers intact
  const grouped = groupByDate(visible)
  const allGrouped = groupByDate(deduped)

  return (
    <div>
      {grouped.map(({ date, items }) => {
        const inc = sumIncome(items)
        const exp = sumExpense(items)
        return (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {formatDisplay(date, 'EEE, MMM d')}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {inc > 0 && <span className="text-green-600 dark:text-green-400">+{formatCurrency(inc)}</span>}
                {exp > 0 && <span className="text-red-500 dark:text-red-400">-{formatCurrency(exp)}</span>}
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map(t => (
                <TransactionItem key={t.id} transaction={t} transferNeutral={transferNeutral} />
              ))}
            </div>
          </div>
        )
      })}
      <ShowMoreButton shown={visible.length} total={deduped.length} onMore={() => setPage(p => p + 1)} />
    </div>
  )
}
