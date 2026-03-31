import { format } from 'date-fns'
import { getTransactionsForDay, sumIncome, sumExpense } from '../../utils/aggregations.js'
import { toDateString } from '../../utils/dateHelpers.js'

// Compact formatter to fit amounts inside small calendar cells
function fmt(val) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
  if (val >= 10_000)    return Math.round(val / 1_000) + 'k'
  if (val >= 1_000)     return (val / 1_000).toFixed(1) + 'k'
  return val.toFixed(2)
}

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
        relative flex flex-col items-center justify-start pt-1 pb-1 px-0.5 rounded-xl
        min-h-[62px] sm:min-h-[76px] transition w-full overflow-hidden
        ${!isCurrentMonth ? 'opacity-30' : ''}
        ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
        ${isToday && !isSelected ? 'ring-2 ring-inset ring-indigo-500' : ''}
      `}
    >
      {/* Day number */}
      <span className={`text-xs font-semibold leading-tight ${
        isSelected ? 'text-white'
          : isToday ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {format(day, 'd')}
      </span>

      {hasTxns && (
        <div className="flex flex-col items-center w-full mt-0.5 gap-0">
          {/* Net total — all screen sizes */}
          <span className={`text-[9px] font-bold leading-tight w-full text-center truncate ${
            isSelected
              ? net >= 0 ? 'text-green-200' : 'text-red-200'
              : net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
          }`}>
            {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
          </span>

          {/* Inc + Exp breakdown — stacked vertically to prevent overflow */}
          {inc > 0 && exp > 0 && (
            <>
              <span className={`text-[8px] leading-tight w-full text-center truncate ${
                isSelected ? 'text-green-300' : 'text-green-500 dark:text-green-400'
              }`}>↑{fmt(inc)}</span>
              <span className={`text-[8px] leading-tight w-full text-center truncate ${
                isSelected ? 'text-red-300' : 'text-red-400 dark:text-red-400'
              }`}>↓{fmt(exp)}</span>
            </>
          )}
        </div>
      )}
    </button>
  )
}
