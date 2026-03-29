import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
  format, eachDayOfInterval, addMonths, subMonths,
  addWeeks, subWeeks, isSameDay, isSameMonth,
  parseISO, isValid,
} from 'date-fns'

export const FMT = 'yyyy-MM-dd'

export function toDateString(date) {
  return format(date, FMT)
}

export function parseDate(str) {
  if (!str) return null
  const d = typeof str === 'string' ? parseISO(str) : str
  return isValid(d) ? d : null
}

export function getWeekRange(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return { start: toDateString(start), end: toDateString(end), startDate: start, endDate: end }
}

export function getMonthRange(date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return { start: toDateString(start), end: toDateString(end), startDate: start, endDate: end }
}

export function getQuarterRange(date) {
  const start = startOfQuarter(date)
  const end = endOfQuarter(date)
  return { start: toDateString(start), end: toDateString(end), startDate: start, endDate: end }
}

export function getYearRange(date) {
  const start = startOfYear(date)
  const end = endOfYear(date)
  return { start: toDateString(start), end: toDateString(end), startDate: start, endDate: end }
}

export function getPeriodRange(period, date) {
  switch (period) {
    case 'week':    return getWeekRange(date)
    case 'month':   return getMonthRange(date)
    case 'quarter': return getQuarterRange(date)
    case 'year':    return getYearRange(date)
    default:        return getMonthRange(date)
  }
}

export function navigatePeriod(period, date, direction) {
  // direction: 1 = next, -1 = prev
  switch (period) {
    case 'week':    return direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1)
    case 'month':   return direction > 0 ? addMonths(date, 1) : subMonths(date, 1)
    case 'quarter': return direction > 0 ? addMonths(date, 3) : subMonths(date, 3)
    case 'year':    return direction > 0 ? addMonths(date, 12) : subMonths(date, 12)
    default:        return direction > 0 ? addMonths(date, 1) : subMonths(date, 1)
  }
}

export function buildMonthGrid(date) {
  const firstDay = startOfMonth(date)
  const lastDay = endOfMonth(date)
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(lastDay, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  return days
}

export function buildWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function isSameDate(a, b) {
  if (!a || !b) return false
  const da = typeof a === 'string' ? parseISO(a) : a
  const db = typeof b === 'string' ? parseISO(b) : b
  return isSameDay(da, db)
}

export function isCurrentMonth(day, referenceDate) {
  return isSameMonth(day, referenceDate)
}

export function formatDisplay(date, fmt = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, fmt) : ''
}

export function formatMonthYear(date) {
  return format(date, 'MMMM yyyy')
}

export function formatWeekLabel(date) {
  const { startDate, endDate } = getWeekRange(date)
  return `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`
}

export function today() {
  return new Date()
}
