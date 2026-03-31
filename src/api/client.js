const BASE_URL = import.meta.env.VITE_API_URL

if (!BASE_URL) {
  console.warn('[api] VITE_API_URL is not set. Requests will fail. Copy .env.example to .env and fill in your Google Apps Script URL.')
}

async function request(method, params = {}, body = null) {
  const url = new URL(BASE_URL)

  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v)
    })
  }

  const options = {
    method,
    redirect: 'follow', // Required: GAS redirects POST before returning JSON
  }

  if (method === 'POST' && body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url.toString(), options)

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const json = await res.json()

  if (json.error) {
    throw new Error(json.error)
  }

  return json
}

export const api = {
  // ── Transactions ──────────────────────────────────────────
  getTransactions(startDate, endDate) {
    return request('GET', { action: 'getTransactions', startDate, endDate })
  },

  addTransaction(data) {
    return request('POST', {}, { action: 'addTransaction', data })
  },

  updateTransaction(id, data) {
    return request('POST', {}, { action: 'updateTransaction', id, data })
  },

  deleteTransaction(id) {
    return request('POST', {}, { action: 'deleteTransaction', id })
  },

  addTransfer(data) {
    return request('POST', {}, { action: 'addTransfer', data })
  },

  deleteTransfer(transferId) {
    return request('POST', {}, { action: 'deleteTransfer', transferId })
  },

  updateTransfer(transferId, data) {
    return request('POST', {}, { action: 'updateTransfer', transferId, data })
  },

  // ── Categories ────────────────────────────────────────────
  getCategories() {
    return request('GET', { action: 'getCategories' })
  },

  addCategory(data) {
    return request('POST', {}, { action: 'addCategory', data })
  },

  updateCategory(id, data) {
    return request('POST', {}, { action: 'updateCategory', id, data })
  },

  deleteCategory(id) {
    return request('POST', {}, { action: 'deleteCategory', id })
  },

  reorderCategories(ids) {
    return request('POST', {}, { action: 'reorderCategories', ids })
  },

  // ── Accounts ──────────────────────────────────────────────
  getAccounts() {
    return request('GET', { action: 'getAccounts' })
  },

  addAccount(data) {
    return request('POST', {}, { action: 'addAccount', data })
  },

  updateAccount(id, data) {
    return request('POST', {}, { action: 'updateAccount', id, data })
  },

  deleteAccount(id) {
    return request('POST', {}, { action: 'deleteAccount', id })
  },

  // ── Schedules ─────────────────────────────────────────────
  getSchedules() {
    return request('GET', { action: 'getSchedules' })
  },

  addSchedule(data) {
    return request('POST', {}, { action: 'addSchedule', data })
  },

  updateSchedule(id, data) {
    return request('POST', {}, { action: 'updateSchedule', id, data })
  },

  deleteSchedule(id, deleteTxns = false) {
    return request('POST', {}, { action: 'deleteSchedule', id, data: { deleteTxns } })
  },

  getScheduleTransactionCount(id) {
    return request('GET', { action: 'getScheduleTransactionCount', id })
  },

  applyDueSchedules() {
    return request('POST', {}, { action: 'applyDueSchedules' })
  },

  // ── Preferences ───────────────────────────────────────────
  getPreferences() {
    return request('GET', { action: 'getPreferences' })
  },

  setPreference(key, value) {
    return request('POST', {}, { action: 'setPreference', data: { key, value } })
  },

  ping() {
    return request('GET', { action: 'ping' })
  },
}
