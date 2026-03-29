import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback(({ message, type = 'success', duration = 3000 }) => {
    const id = ++toastId
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="fixed bottom-24 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-xs px-4">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ message, type, onDismiss }) {
  const colors = {
    success: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
    error:   'bg-red-500 text-white',
    info:    'bg-indigo-500 text-white',
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${colors[type] || colors.success} animate-fade-in`}
      onClick={onDismiss}
    >
      <span>{icons[type] || icons.success}</span>
      <span>{message}</span>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
