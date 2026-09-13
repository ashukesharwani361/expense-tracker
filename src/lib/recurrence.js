import { todayIso } from './format.js'

const RECURRENCE_UUID_NAMESPACE = '6b339cf5-5671-5df8-9271-ec9f5d944b4f'

function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid calendar date: ${value}`)
  }

  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Invalid calendar date: ${value}`)
  }

  return { year, month, day }
}

function formatCalendarDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function addCalendarDays(value, count) {
  let { year, month, day } = parseCalendarDate(value)

  for (let remaining = count; remaining > 0; remaining -= 1) {
    day += 1
    if (day > daysInMonth(year, month)) {
      day = 1
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
  }

  return formatCalendarDate(year, month, day)
}

export function isOccurrenceDue(nextDate, today = todayIso()) {
  parseCalendarDate(nextDate)
  parseCalendarDate(today)
  return nextDate <= today
}

export function nextWeeklyOccurrence(value) {
  return addCalendarDays(value, 7)
}

export function nextMonthlyOccurrence(value) {
  const { year, month, day } = parseCalendarDate(value)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return formatCalendarDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)))
}

export function nextYearlyOccurrence(value) {
  const { year, month, day } = parseCalendarDate(value)
  const nextYear = year + 1
  return formatCalendarDate(nextYear, month, Math.min(day, daysInMonth(nextYear, month)))
}

export function nextRecurringOccurrence(value, cadence) {
  if (cadence === 'weekly') return nextWeeklyOccurrence(value)
  if (cadence === 'monthly') return nextMonthlyOccurrence(value)
  if (cadence === 'yearly') return nextYearlyOccurrence(value)
  throw new Error(`Unsupported recurring cadence: ${cadence}`)
}

function uuidToBytes(uuid) {
  const normalized = uuid.replace(/-/g, '')
  if (!/^[0-9a-f]{32}$/i.test(normalized)) {
    throw new Error(`Invalid UUID: ${uuid}`)
  }

  return Uint8Array.from(normalized.match(/.{2}/g), (pair) => Number.parseInt(pair, 16))
}

function bytesToUuid(bytes) {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export async function recurringOccurrenceId({ userId, recurringExpenseId, occurrenceDate }) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is required to process recurring expenses.')
  }

  parseCalendarDate(occurrenceDate)
  const name = new TextEncoder().encode(`${userId}:${recurringExpenseId}:${occurrenceDate}`)
  const namespace = uuidToBytes(RECURRENCE_UUID_NAMESPACE)
  const input = new Uint8Array(namespace.length + name.length)
  input.set(namespace)
  input.set(name, namespace.length)

  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', input))
  const uuid = digest.slice(0, 16)
  uuid[6] = (uuid[6] & 0x0f) | 0x50
  uuid[8] = (uuid[8] & 0x3f) | 0x80
  return bytesToUuid(uuid)
}
