import { parseISO, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { parseDate } from './dateHelpers.js'

export function filterByDateRange(transactions, startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  return transactions.filter(t => {
    const d = parseDate(t.date)
    if (!d) return false
    if (start && d < start) return false
    if (end && d > new Date(endDate + 'T23:59:59')) return false
    return true
  })
}

// Helper: get amount in default currency
function baseAmount(t) {
  return Number(t.amount) * (Number(t.exchangeRate) || 1)
}

export function sumIncome(transactions) {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + baseAmount(t), 0)
}

export function sumExpense(transactions) {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + baseAmount(t), 0)
}

export function netBalance(transactions) {
  return sumIncome(transactions) - sumExpense(transactions)
}

// Net effect of transfers on an account's balance.
// Assumes transactions are already filtered to a single account.
// Each transfer record carries fromAccountId + toAccountId.
export function sumTransferBalance(transactions) {
  return transactions
    .filter(t => t.type === 'transfer')
    .reduce((acc, t) => {
      const amt = baseAmount(t)
      if (t.accountId === t.fromAccountId) return acc - amt  // money leaving
      if (t.accountId === t.toAccountId)   return acc + amt  // money arriving
      return acc
    }, 0)
}

export function groupByCategory(transactions, categories) {
  const map = {}
  transactions.forEach(t => {
    const key = t.categoryId || 'uncategorized'
    if (!map[key]) map[key] = { categoryId: key, total: 0 }
    map[key].total += baseAmount(t)
  })

  return Object.values(map).map(item => {
    const cat = categories.find(c => c.id === item.categoryId)
    return {
      ...item,
      name: cat ? cat.name : 'Uncategorized',
      color: cat ? cat.color : '#6B7280',
      icon: cat ? cat.icon : '📦',
    }
  }).sort((a, b) => b.total - a.total)
}

export function groupBySubCategory(transactions, categories) {
  const map = {}
  transactions.forEach(t => {
    const subKey = t.subCategoryId || `__general__${t.categoryId || 'uncategorized'}`
    if (!map[subKey]) map[subKey] = { subCategoryId: t.subCategoryId || '', categoryId: t.categoryId || '', total: 0 }
    map[subKey].total += baseAmount(t)
  })

  return Object.values(map).map(item => {
    const parent = categories.find(c => c.id === item.categoryId)
    const sub = categories.find(c => c.id === item.subCategoryId)
    const subName = sub ? sub.name : 'General'
    const parentName = parent ? parent.name : 'Uncategorized'
    return {
      ...item,
      name: `${parentName} › ${subName}`,
      color: sub ? sub.color : (parent ? parent.color : '#6B7280'),
      icon: sub ? sub.icon : (parent ? parent.icon : '📦'),
    }
  }).sort((a, b) => b.total - a.total)
}

export function groupByAccount(transactions, accounts) {
  const map = {}
  transactions.forEach(t => {
    const key = t.accountId || 'unknown'
    if (!map[key]) map[key] = { accountId: key, income: 0, expense: 0, total: 0 }
    const amt = baseAmount(t)
    if (t.type === 'income')  { map[key].income  += amt; map[key].total += amt }
    else if (t.type === 'expense') { map[key].expense += amt; map[key].total += amt }
    // transfers: excluded from stats grouping
  })

  return Object.values(map).map(item => {
    const acc = accounts.find(a => a.id === item.accountId)
    return {
      ...item,
      name: acc ? acc.name : 'Unknown',
      color: acc ? acc.color : '#6B7280',
      icon: acc ? acc.icon : '💳',
    }
  }).sort((a, b) => b.total - a.total)
}

export function groupByDate(transactions) {
  const map = {}
  transactions.forEach(t => {
    const key = t.date
    if (!map[key]) map[key] = []
    map[key].push(t)
  })
  // Return sorted descending
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
}

export function getDailyTotals(transactions, startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end) return []

  const days = eachDayOfInterval({ start, end })
  return days.map(day => {
    const key = format(day, 'yyyy-MM-dd')
    const dayTxns = transactions.filter(t => t.date === key)
    return {
      date: key,
      label: format(day, 'MMM d'),
      income: sumIncome(dayTxns),
      expense: sumExpense(dayTxns),
    }
  })
}

// Normalize a date value to YYYY-MM-DD string (handles ISO timestamps too)
function normDate(val) {
  if (!val) return ''
  const s = String(val)
  // ISO timestamp like "2024-01-15T00:00:00.000Z" → take first 10 chars
  return s.length > 10 ? s.slice(0, 10) : s
}

export function getTransactionsForDay(transactions, dateStr) {
  return transactions.filter(t => normDate(t.date) === dateStr)
}

export function getTransactionsForDateRange(transactions, startDate, endDate) {
  return filterByDateRange(transactions, startDate, endDate)
}

export function hasTransactionsOnDay(transactions, dateStr) {
  return transactions.some(t => normDate(t.date) === dateStr)
}
