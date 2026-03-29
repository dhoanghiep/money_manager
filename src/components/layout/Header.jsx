import { useTheme } from '../../context/ThemeContext.jsx'

export function Header({ title, left, right }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
      {left && <div className="flex-shrink-0">{left}</div>}
      <h1 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      {right && <div className="flex-shrink-0">{right}</div>}
      <button
        onClick={toggleTheme}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        title="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
