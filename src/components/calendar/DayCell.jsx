import { format } from 'date-fns'
import { getTransactionsForDay, sumIncome, sumExpense } from '../../utils/aggregations.js'
import { toDateString } from '../../utils/dateHelpers.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'

export function DayCell({ day, transactions, isCurrentMonth, isSelected, isToday, onClick }) {
  const dateStr = toDateString(day)
  const dayTxns = getTransactionsForDay(transactions, dateStr)
  const inc = sumIncome(dayTxns)
  const exp = sumExpense(dayTxns)
  const net = inc - exp
  const hasTxns = dayTxns.length > 0

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-start p-1 rounded-xl min-h-[60px] sm:min-h-[76px] transition w-full
        ${!isCurrentMonth ? 'opacity-30' : ''}
        ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
        ${isToday && !isSelected ? 'ring-2 ring-indigo-500' : ''}
      `}
    >
      {/* Day number */}
      <span className={`text-sm font-semibold leading-tight ${
        isSelected ? 'text-white' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
      }`}>
        {format(day, 'd')}
      </span>

      {hasTxns && (
        <>
          {/* Mobile: colored dots */}
          <div className="flex gap-0.5 mt-0.5 sm:hidden">
            {inc > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-300' : 'bg-green-500'}`} />}
            {exp > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-300' : 'bg-red-400'}`} />}
          </div>

          {/* Desktop: show net total + breakdown */}
          <div className="hidden sm:flex flex-col items-center gap-0.5 mt-1 w-full px-0.5">
            {/* Net total */}
            <span className={`text-[11px] font-bold leading-tight ${
              isSelected
                ? net >= 0 ? 'text-green-200' : 'text-red-200'
                : net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
            }`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
            {/* Breakdown (only if both exist) */}
            {inc > 0 && exp > 0 && (
              <div className="flex gap-1">
                <span className={`text-[9px] ${isSelected ? 'text-green-300' : 'text-green-500 dark:text-green-500'}`}>
                  ↑{formatCurrency(inc)}
                </span>
                <span className={`text-[9px] ${isSelected ? 'text-red-300' : 'text-red-400 dark:text-red-500'}`}>
                  ↓{formatCurrency(exp)}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </button>
  )
}
