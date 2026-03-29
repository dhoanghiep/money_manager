import { buildMonthGrid, isSameDate, isCurrentMonth, today } from '../../utils/dateHelpers.js'
import { DayCell } from './DayCell.jsx'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthGrid({ referenceDate, transactions, selectedDay, onSelectDay }) {
  const days = buildMonthGrid(referenceDate)
  const todayDate = today()

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => (
          <DayCell
            key={day.toISOString()}
            day={day}
            transactions={transactions}
            isCurrentMonth={isCurrentMonth(day, referenceDate)}
            isSelected={isSameDate(day, selectedDay)}
            isToday={isSameDate(day, todayDate)}
            onClick={() => onSelectDay(day)}
          />
        ))}
      </div>
    </div>
  )
}
