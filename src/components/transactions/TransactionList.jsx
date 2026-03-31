import { TransactionItem } from './TransactionItem.jsx'
import { groupByDate } from '../../utils/aggregations.js'
import { formatDisplay } from '../../utils/dateHelpers.js'
import { EmptyState } from '../ui/EmptyState.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { sumIncome, sumExpense } from '../../utils/aggregations.js'

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

export function TransactionList({ transactions, showDateHeaders = true, transferNeutral = false }) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState icon="💸" title="No transactions" description="Tap + to add your first transaction" />
  }

  const deduped = dedupeTransfers(transactions)

  if (!showDateHeaders) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {deduped.map(t => (
          <TransactionItem key={t.id} transaction={t} showDate transferNeutral={transferNeutral} />
        ))}
      </div>
    )
  }

  const grouped = groupByDate(deduped)

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
    </div>
  )
}
