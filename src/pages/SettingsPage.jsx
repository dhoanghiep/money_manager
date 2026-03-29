import { useState } from 'react'
import { Header } from '../components/layout/Header.jsx'
import { CategoryManager } from '../components/categories/CategoryManager.jsx'
import { AccountManager } from '../components/accounts/AccountManager.jsx'
const TABS = [
  { id: 'categories', label: '🏷 Categories' },
  { id: 'accounts',   label: '🏦 Accounts'   },
]

export function SettingsPage() {
  const [tab, setTab] = useState('categories')

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Settings" />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-medium transition border-b-2 ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'categories' && <CategoryManager />}
        {tab === 'accounts'   && <AccountManager />}
      </div>
    </div>
  )
}
