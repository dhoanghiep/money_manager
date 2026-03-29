import { format } from 'date-fns'
import { buildWeekDays, isSameDate, today, toDateString } from '../../utils/dateHelpers.js'
import { getTransactionsForDay, sumIncome, sumExpense } from '../../utils/aggregations.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeekStrip({ referenceDate, transactions, selectedDay, onSelectDay }) {
  const days = buildWeekDays(referenceDate)
  const todayDate = today()

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const dateStr = toDateString(day)
        const dayTxns = getTransactionsForDay(transactions, dateStr)
        const inc = sumIncome(dayTxns)
        const exp = sumExpense(dayTxns)
        const isSelected = isSameDate(day, selectedDay)
        const isToday = isSameDate(day, todayDate)

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={`
              flex flex-col items-center py-2 px-1 rounded-xl transition
              ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
              ${isToday && !isSelected ? 'ring-2 ring-indigo-500' : ''}
            `}
          >
            <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>
              {WEEK_DAYS[i]}
            </span>
            <span className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-white' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}`}>
              {format(day, 'd')}
            </span>
            {inc > 0 && <span className={`text-[9px] font-medium mt-0.5 ${isSelected ? 'text-green-300' : 'text-green-600 dark:text-green-400'}`}>+{formatCurrency(inc)}</span>}
            {exp > 0 && <span className={`text-[9px] font-medium ${inc > 0 ? '' : 'mt-0.5'} ${isSelected ? 'text-red-300' : 'text-red-500 dark:text-red-400'}`}>-{formatCurrency(exp)}</span>}
          </button>
        )
      })}
    </div>
  )
}
