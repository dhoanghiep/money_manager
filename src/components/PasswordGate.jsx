import { useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD
const SESSION_KEY = 'mm_unlocked'

export function usePasswordGate() {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  })

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setUnlocked(true)
  }

  return { unlocked, unlock }
}

export function PasswordGate({ onUnlock }) {
  const { theme, toggleTheme } = useTheme()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (password === CORRECT_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div
        className={`w-full max-w-xs flex flex-col items-center gap-6 ${shake ? 'animate-shake' : ''}`}
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <span className="text-4xl">💰</span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Money Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            className={`w-full rounded-xl border px-4 py-3 text-sm text-center tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition
              ${error
                ? 'border-red-400 focus:ring-red-400 placeholder-red-300'
                : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500'
              }`}
          />
          {error && (
            <p className="text-xs text-red-500 text-center -mt-1">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition"
          >
            Unlock
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  )
}
