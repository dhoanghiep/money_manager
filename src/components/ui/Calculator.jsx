import { useState } from 'react'

// Simple 4-op calculator modal matching the design in the screenshot.
// Props:
//   initialValue – string pre-loaded into the display
//   onDone(result: string) – called with the final numeric string
//   onClose() – called when × is pressed without committing

const BUTTONS = [
  ['AC', '÷', '×', '⌫'],
  ['7',  '8', '9', '−'],
  ['4',  '5', '6', '+'],
  ['1',  '2', '3', '='],
  ['00', '0', '.', 'DONE'],
]

function evaluate(expr) {
  // Replace display operators with JS operators
  const jsExpr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + jsExpr + ')')()
    if (!isFinite(result) || isNaN(result)) return null
    // Round to 2 decimal places to avoid floating-point noise
    return String(Math.round(result * 100) / 100)
  } catch {
    return null
  }
}

// Scale display text down when expression is long
function displaySize(str) {
  const len = str.length
  if (len <= 8)  return 'text-5xl'
  if (len <= 12) return 'text-4xl'
  if (len <= 18) return 'text-3xl'
  return 'text-2xl'
}

function equationSize(str) {
  const len = str.length
  if (len <= 16) return 'text-base'
  if (len <= 24) return 'text-sm'
  return 'text-xs'
}

export function Calculator({ initialValue = '', onDone, onClose }) {
  const [display, setDisplay]   = useState(initialValue || '0')
  const [equation, setEquation] = useState('') // expression shown above result after =
  const [justEvaled, setJustEvaled] = useState(false)

  function press(key) {
    setDisplay(prev => {
      if (key === 'AC') {
        setJustEvaled(false)
        setEquation('')
        return '0'
      }

      if (key === '⌫') {
        setJustEvaled(false)
        setEquation('')
        const next = prev.length > 1 ? prev.slice(0, -1) : '0'
        return next
      }

      if (key === '=') {
        const result = evaluate(prev)
        setJustEvaled(true)
        setEquation(prev + ' =')   // store expression for display
        return result ?? prev
      }

      const isOp = ['÷', '×', '−', '+'].includes(key)

      // After evaluation, pressing an operator continues from result;
      // pressing a digit starts fresh
      if (justEvaled) {
        setJustEvaled(false)
        if (isOp) {
          // keep equation visible, continue expression
          setEquation('')
          return prev + key
        }
        setEquation('')
        return key === '.' ? '0.' : key
      }

      // Don't allow two operators in a row
      if (isOp) {
        const lastChar = prev[prev.length - 1]
        if (['÷', '×', '−', '+'].includes(lastChar)) {
          return prev.slice(0, -1) + key
        }
      }

      // Don't allow a second decimal in the current number segment
      if (key === '.') {
        const segments = prev.split(/[÷×−+]/)
        const current = segments[segments.length - 1]
        if (current.includes('.')) return prev
      }

      // Replace leading '0' with digit (but keep '0.' intact)
      if (prev === '0' && key !== '.') return key

      return prev + key
    })
  }

  function handleDone() {
    const result = evaluate(display) ?? display
    onDone(result)
  }

  const buttonStyle = (key) => {
    if (key === 'DONE') return 'bg-red-400 text-white font-bold text-base'
    if (key === 'AC')   return 'bg-gray-600 dark:bg-gray-500 text-white font-semibold'
    if (['÷', '×', '−', '+', '⌫'].includes(key))
                        return 'bg-gray-600 dark:bg-gray-500 text-white font-semibold'
    if (key === '=')    return 'bg-gray-600 dark:bg-gray-500 text-white font-semibold'
    return 'bg-gray-700 dark:bg-gray-700 text-white font-medium'
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-gray-800 dark:bg-gray-900 rounded-t-2xl overflow-hidden shadow-2xl">
        {/* Display */}
        <div className="relative px-5 pt-10 pb-6 text-right min-h-[120px] flex flex-col justify-end">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-4 text-gray-400 hover:text-white text-xl p-1"
          >×</button>
          {/* Equation line — shown after = is pressed */}
          {equation && (
            <div className={`text-gray-400 font-light mb-1 truncate ${equationSize(equation)}`}>
              {equation}
            </div>
          )}
          {/* Main display — scales down when long */}
          <div className={`text-white font-light tracking-tight truncate transition-all ${displaySize(display)}`}>
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="border-t border-gray-700">
          {BUTTONS.map((row, ri) => (
            <div key={ri} className="flex border-b border-gray-700 last:border-0">
              {row.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={key === 'DONE' ? handleDone : () => press(key)}
                  className={`flex-1 py-5 text-xl border-r border-gray-700 last:border-0 active:opacity-60 transition-opacity ${buttonStyle(key)}`}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
