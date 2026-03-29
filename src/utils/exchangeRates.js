export const SUPPORTED_CURRENCIES = [
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 0 },
  { code: 'USD', symbol: '$',  name: 'US Dollar',         decimals: 0 },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong',   decimals: 0 },
]

// Fetch live rates from Frankfurter API (free, no key needed).
// Returns { USD: X, VND: Y } where X = "1 USD = X [defaultCurrency]"
export async function fetchLiveRates(defaultCurrency, otherCodes) {
  if (otherCodes.length === 0) return {}
  const url = `https://api.frankfurter.app/latest?from=${defaultCurrency}&to=${otherCodes.join(',')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not fetch rates from frankfurter.app')
  const data = await res.json()
  // Invert: 1 target = X defaultCurrency
  const rates = {}
  for (const [code, rate] of Object.entries(data.rates || {})) {
    rates[code] = 1 / rate
  }
  return rates
}
