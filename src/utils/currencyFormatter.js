// Currencies with 0 decimal places
const ZERO_DECIMAL = new Set(['VND', 'JPY', 'KRW', 'IDR'])

export function formatCurrency(amount, currency = 'AUD') {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 0 // keep 0 for all for clean UI
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(amount) || 0)
}

export function formatNumber(amount) {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function getCurrencySymbol(currency = 'AUD') {
  try {
    return (0).toLocaleString('en-AU', { style: 'currency', currency, minimumFractionDigits: 0 })
      .replace(/[\d,.\s]/g, '').trim()
  } catch {
    return currency
  }
}
