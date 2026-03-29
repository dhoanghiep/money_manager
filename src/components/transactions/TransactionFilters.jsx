import { useApp } from '../../context/AppContext.jsx'

export function TransactionFilters({ filters, onChange }) {
  const { categories, accounts } = useApp()

  function update(key, value) {
    onChange({ ...filters, [key]: value })
  }

  const selectClass = 'text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none'

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800">
      {/* Type filter */}
      <select className={selectClass} value={filters.type || ''} onChange={e => update('type', e.target.value)}>
        <option value="">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>

      {/* Category filter */}
      <select className={selectClass} value={filters.categoryId || ''} onChange={e => update('categoryId', e.target.value)}>
        <option value="">All categories</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>

      {/* Account filter */}
      <select className={selectClass} value={filters.accountId || ''} onChange={e => update('accountId', e.target.value)}>
        <option value="">All accounts</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
        ))}
      </select>

      {/* Clear */}
      {(filters.type || filters.categoryId || filters.accountId) && (
        <button
          className="text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap hover:underline flex-shrink-0"
          onClick={() => onChange({ type: '', categoryId: '', accountId: '' })}
        >
          Clear
        </button>
      )}
    </div>
  )
}
