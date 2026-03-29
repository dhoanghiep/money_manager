import { useState, useEffect } from 'react'
import { useCurrency } from '../../context/CurrencyContext.jsx'
import { SUPPORTED_CURRENCIES } from '../../utils/exchangeRates.js'
import { useToast } from '../ui/Toast.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'

export function CurrencyManager() {
  const { defaultCurrency, setDefaultCurrency, rates, setRate, fetchRates, fetching, ratesUpdatedAt } = useCurrency()
  const toast = useToast()
  // Local input state for rate fields
  const [localRates, setLocalRates] = useState({})

  const otherCurrencies = SUPPORTED_CURRENCIES.filter(c => c.code !== defaultCurrency)

  // Sync localRates when rates change
  useEffect(() => {
    const init = {}
    otherCurrencies.forEach(c => {
      init[c.code] = rates[c.code] !== undefined ? String(rates[c.code]) : ''
    })
    setLocalRates(init)
  }, [defaultCurrency, rates])

  async function handleFetch() {
    try {
      const fetched = await fetchRates()
      toast.show({ message: 'Live rates fetched ✓' })
    } catch (e) {
      toast.show({ message: `Failed: ${e.message}`, type: 'error' })
    }
  }

  function handleRateSave(code) {
    const v = parseFloat(localRates[code])
    if (isNaN(v) || v <= 0) return
    setRate(code, v)
    toast.show({ message: `Saved: 1 ${code} = ${v} ${defaultCurrency}` })
  }

  return (
    <div className="p-4 flex flex-col gap-6">

      {/* Default currency selector */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Default Currency
        </p>
        <div className="flex gap-2 flex-wrap">
          {SUPPORTED_CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => setDefaultCurrency(c.code)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                defaultCurrency === c.code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
              }`}
            >
              {c.symbol} {c.code}
              <span className="ml-1 text-xs font-normal opacity-70">{c.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          All amounts shown in {defaultCurrency}. Changing this clears saved rates.
        </p>
      </div>

      {/* Exchange rates */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Exchange Rates → {defaultCurrency}
          </p>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline disabled:opacity-50 transition"
          >
            {fetching ? '⏳ Fetching…' : '↻ Fetch live rates'}
          </button>
        </div>
        {ratesUpdatedAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Last updated: {new Date(ratesUpdatedAt).toLocaleString()}
          </p>
        )}

        <div className="flex flex-col gap-3 mt-3">
          {otherCurrencies.map(c => (
            <div key={c.code} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{c.symbol} {c.code}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{c.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">1 {c.code} =</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={localRates[c.code] ?? ''}
                    onChange={e => setLocalRates(prev => ({ ...prev, [c.code]: e.target.value }))}
                    onBlur={() => handleRateSave(c.code)}
                    onKeyDown={e => e.key === 'Enter' && handleRateSave(c.code)}
                    placeholder="0.00"
                    className="w-28 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{defaultCurrency}</span>
                </div>
              </div>
              {/* Preview */}
              {rates[c.code] > 0 && (
                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
                  e.g. {c.symbol}100 → {formatCurrency(100 * rates[c.code], defaultCurrency)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
