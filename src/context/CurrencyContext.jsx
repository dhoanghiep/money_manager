import { createContext, useContext, useState, useCallback } from 'react'
import { SUPPORTED_CURRENCIES, fetchLiveRates } from '../utils/exchangeRates.js'

const LS_DEFAULT  = 'mm_default_currency'
const LS_RATES    = 'mm_rates'
const LS_UPDATED  = 'mm_rates_updated'

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [defaultCurrency, setDefaultCurrencyState] = useState(
    () => localStorage.getItem(LS_DEFAULT) || 'AUD'
  )
  const [rates, setRatesState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_RATES) || '{}') } catch { return {} }
  })
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(
    () => localStorage.getItem(LS_UPDATED) || null
  )
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  function setDefaultCurrency(code) {
    setDefaultCurrencyState(code)
    localStorage.setItem(LS_DEFAULT, code)
    // Clear rates — they are relative to the old default
    setRatesState({})
    localStorage.removeItem(LS_RATES)
    localStorage.removeItem(LS_UPDATED)
    setRatesUpdatedAt(null)
  }

  function setRate(code, rate) {
    const next = { ...rates, [code]: Number(rate) }
    setRatesState(next)
    localStorage.setItem(LS_RATES, JSON.stringify(next))
  }

  // Returns: 1 [currency] = X [defaultCurrency]
  function getRate(currency) {
    if (!currency || currency === defaultCurrency) return 1
    return rates[currency] || 1
  }

  // Convert an amount in `currency` to defaultCurrency.
  // If savedRate is provided (stored on transaction), use that instead of the current rate.
  function toDefault(amount, currency, savedRate) {
    if (!currency || currency === defaultCurrency) return Number(amount)
    const rate = (savedRate !== undefined && savedRate !== null && savedRate !== '')
      ? Number(savedRate)
      : getRate(currency)
    return Number(amount) * rate
  }

  const fetchRates = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const otherCodes = SUPPORTED_CURRENCIES
        .map(c => c.code)
        .filter(c => c !== defaultCurrency)
      const fetched = await fetchLiveRates(defaultCurrency, otherCodes)
      const next = { ...rates, ...fetched }
      setRatesState(next)
      localStorage.setItem(LS_RATES, JSON.stringify(next))
      const now = new Date().toISOString()
      setRatesUpdatedAt(now)
      localStorage.setItem(LS_UPDATED, now)
      return fetched
    } catch (e) {
      setFetchError(e.message)
      throw e
    } finally {
      setFetching(false)
    }
  }, [defaultCurrency, rates])

  // Fetch live rate for a single currency (used in TransactionForm)
  async function fetchSingleRate(currency) {
    if (!currency || currency === defaultCurrency) return 1
    const fetched = await fetchLiveRates(defaultCurrency, [currency])
    const rate = fetched[currency]
    if (rate) setRate(currency, rate)
    return rate
  }

  const value = {
    defaultCurrency,
    setDefaultCurrency,
    rates,
    setRate,
    getRate,
    toDefault,
    fetchRates,
    fetchSingleRate,
    fetching,
    fetchError,
    ratesUpdatedAt,
  }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
