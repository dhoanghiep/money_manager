import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Header } from '../components/layout/Header.jsx'
import { MonthGrid } from '../components/calendar/MonthGrid.jsx'
import { WeekStrip } from '../components/calendar/WeekStrip.jsx'
import { TransactionList } from '../components/transactions/TransactionList.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { TransactionForm } from '../components/transactions/TransactionForm.jsx'
import { PageSpinner } from '../components/ui/Spinner.jsx'
import {
  today, toDateString, formatMonthYear, formatWeekLabel,
  navigatePeriod, getMonthRange, getWeekRange, formatDisplay,
} from '../utils/dateHelpers.js'
import { getTransactionsForDay, getTransactionsForDateRange } from '../utils/aggregations.js'
import { useEffect } from 'react'

export function CalendarPage() {
  const { transactions, loading, loadTransactions } = useApp()
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
  const [refDate, setRefDate] = useState(today())
  const [selectedDay, setSelectedDay] = useState(today())
  const [addOpen, setAddOpen] = useState(false)

  // Load transactions for visible range when navigating
  useEffect(() => {
    const range = viewMode === 'month' ? getMonthRange(refDate) : getWeekRange(refDate)
    loadTransactions(range.start, range.end)
  }, [refDate, viewMode])

  const selectedDayStr = toDateString(selectedDay)
  const selectedDayTxns = getTransactionsForDay(transactions, selectedDayStr)

  function navigate(dir) {
    setRefDate(d => navigatePeriod(viewMode, d, dir))
  }

  const periodLabel = viewMode === 'month' ? formatMonthYear(refDate) : formatWeekLabel(refDate)

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Calendar"
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl hover:bg-indigo-700 transition"
          >
            +
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-20 flex flex-col">
        {/* View toggle */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
            {['month', 'week'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  viewMode === m
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">‹</button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-32 text-center">{periodLabel}</span>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">›</button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="px-4 pb-3">
          {viewMode === 'month' ? (
            <MonthGrid
              referenceDate={refDate}
              transactions={transactions}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          ) : (
            <WeekStrip
              referenceDate={refDate}
              transactions={transactions}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          )}
        </div>

        {/* Selected day transactions */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatDisplay(selectedDay, 'EEE, MMMM d')}
            </span>
            <button
              onClick={() => setAddOpen(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              + Add
            </button>
          </div>
          {loading.transactions ? (
            <PageSpinner />
          ) : (
            <TransactionList transactions={selectedDayTxns} showDateHeaders={false} />
          )}
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Transaction">
        <TransactionForm
          transaction={{ date: selectedDayStr }}
          onClose={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  )
}
