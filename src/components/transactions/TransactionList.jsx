import { TransactionItem } from './TransactionItem.jsx'
import { groupByDate } from '../../utils/aggregations.js'
import { formatDisplay } from '../../utils/dateHelpers.js'
import { EmptyState } from '../ui/EmptyState.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { sumIncome, sumExpense } from '../../utils/aggregations.js'

export function TransactionList({ transactions, showDateHeaders = true }) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState icon="💸" title="No transactions" description="Tap + to add your first transaction" />
  }

  if (!showDateHeaders) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {transactions.map(t => (
          <TransactionItem key={t.id} transaction={t} showDate />
        ))}
      </div>
    )
  }

  const grouped = groupByDate(transactions)

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
                <TransactionItem key={t.id} transaction={t} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
