import { formatCurrency } from '../../utils/currencyFormatter.js'

export function StatCard({ label, amount, type, icon }) {
  const colors = {
    income:  'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    expense: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    net:     'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  }

  const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
  const absAmount = Math.abs(amount)

  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-1 ${colors[type] || colors.neutral}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <span className="text-xl font-bold">{prefix}{formatCurrency(absAmount)}</span>
    </div>
  )
}

export function PeriodSelector({ period, onChange }) {
  const options = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ]

  return (
    <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
            period === o.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
