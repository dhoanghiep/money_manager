import { format } from 'date-fns'
import { getTransactionsForDay, sumIncome, sumExpense } from '../../utils/aggregations.js'
import { toDateString } from '../../utils/dateHelpers.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'

export function DayCell({ day, transactions, isCurrentMonth, isSelected, isToday, onClick }) {
  const dateStr = toDateString(day)
  const dayTxns = getTransactionsForDay(transactions, dateStr)
  const inc = sumIncome(dayTxns)
  const exp = sumExpense(dayTxns)
  const hasTxns = dayTxns.length > 0

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-1 rounded-xl min-h-[52px] sm:min-h-[72px] transition
        ${!isCurrentMonth ? 'opacity-30' : ''}
        ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
        ${isToday && !isSelected ? 'ring-2 ring-indigo-600' : ''}
      `}
    >
      {/* Day number */}
      <span className={`text-sm font-semibold ${isSelected ? 'text-white' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {format(day, 'd')}
      </span>

      {/* Dots for mobile */}
      {hasTxns && (
        <div className="flex gap-0.5 mt-0.5 sm:hidden">
          {inc > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-300' : 'bg-green-500'}`} />}
          {exp > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-300' : 'bg-red-400'}`} />}
        </div>
      )}

      {/* Amounts for desktop */}
      {hasTxns && (
        <div className="hidden sm:flex flex-col items-center gap-0.5 mt-1">
          {inc > 0 && (
            <span className={`text-[10px] font-medium ${isSelected ? 'text-green-200' : 'text-green-600 dark:text-green-400'}`}>
              +{formatCurrency(inc)}
            </span>
          )}
          {exp > 0 && (
            <span className={`text-[10px] font-medium ${isSelected ? 'text-red-200' : 'text-red-500 dark:text-red-400'}`}>
              -{formatCurrency(exp)}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
