import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/',             icon: '📅', label: 'Calendar'     },
  { to: '/dashboard',    icon: '📊', label: 'Dashboard'    },
  { to: '/transactions', icon: '💳', label: 'Transactions' },
  { to: '/schedules',    icon: '🔁', label: 'Schedules'    },
  { to: '/settings',     icon: '⚙️',  label: 'Settings'    },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 safe-bottom">
      <div className="flex h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
