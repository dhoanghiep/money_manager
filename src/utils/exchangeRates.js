export const SUPPORTED_CURRENCIES = [
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 0 },
  { code: 'USD', symbol: '$',  name: 'US Dollar',         decimals: 0 },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong',   decimals: 0 },
]

// Fetch from @fawazahmed0/currency-api (free, no key, CORS-friendly CDN).
// Response: { "date": "...", "aud": { "usd": 0.62, "vnd": 15432, ... } }
// Returns { USD: X, VND: Y } where X = "1 USD = X [defaultCurrency]"
async function fetchFromCurrencyApi(baseUrl, defaultCurrency, otherCodes) {
  const base = defaultCurrency.toLowerCase()
  const res = await fetch(`${baseUrl}/v1/currencies/${base}.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const baseRates = data[base] // { usd: 0.62, vnd: 15432 }
  if (!baseRates) throw new Error('Unexpected API response shape')

  // baseRates[code] = "1 defaultCurrency = X otherCurrency"
  // We want: "1 otherCurrency = Y defaultCurrency" → invert
  const rates = {}
  for (const code of otherCodes) {
    const r = baseRates[code.toLowerCase()]
    if (r && r > 0) rates[code] = 1 / r
  }
  return rates
}

export async function fetchLiveRates(defaultCurrency, otherCodes) {
  if (otherCodes.length === 0) return {}

  // Try primary CDN, then fallback mirror
  const endpoints = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest',
    'https://latest.currency-api.pages.dev',
  ]

  for (const base of endpoints) {
    try {
      return await fetchFromCurrencyApi(base, defaultCurrency, otherCodes)
    } catch (e) {
      console.warn(`[exchangeRates] ${base} failed:`, e.message)
    }
  }

  throw new Error('Could not fetch live rates — both sources failed. Enter rates manually.')
}
