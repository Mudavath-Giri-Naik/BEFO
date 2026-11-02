/**
 * Date helpers. All business dates are plain ISO dates ("YYYY-MM-DD") in the tenant's
 * timezone (Asia/Kolkata). Never use the browser's local timezone for business logic.
 * addPeriod mirrors Postgres `date + interval` (month-end clamp: 31 Jan + 1 month = 28/29 Feb).
 */
export type ISODate = string
export const IST = "Asia/Kolkata"

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidISODate(s: string): boolean {
  const m = ISO_RE.exec(s)
  if (!m) return false
  const y = +m[1], mo = +m[2], d = +m[3]
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo)
}

export function parts(d: ISODate): [number, number, number] {
  const m = ISO_RE.exec(d)
  if (!m || !isValidISODate(d)) throw new Error(`Invalid date: ${d}`)
  return [+m[1], +m[2], +m[3]]
}

export function fmt(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number) {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
}

/** Today's date in a timezone (default IST), as ISO. Mirrors SQL tenant_today(). */
export function tenantToday(now: Date = new Date(), timeZone = IST): ISODate {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const get = (t: string) => p.find((x) => x.type === t)!.value
  return `${get("year")}-${get("month")}-${get("day")}`
}

function toUTC(d: ISODate) {
  const [y, m, day] = parts(d)
  return Date.UTC(y, m - 1, day)
}

export function addDays(d: ISODate, n: number): ISODate {
  const t = new Date(toUTC(d) + n * 86_400_000)
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = parts(d)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return fmt(ny, nm, Math.min(day, daysInMonth(ny, nm)))
}

export type PeriodUnit = "day" | "week" | "month"

/** Same result as Postgres `date + (count || ' unit')::interval`. */
export function addPeriod(d: ISODate, unit: PeriodUnit, count: number): ISODate {
  if (unit === "day") return addDays(d, count)
  if (unit === "week") return addDays(d, 7 * count)
  return addMonths(d, count)
}

/** b − a in days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000)
}

export function compareDates(a: ISODate, b: ISODate) {
  return a < b ? -1 : a > b ? 1 : 0
}
export const maxDate = (a: ISODate, b: ISODate) => (a > b ? a : b)
export const minDate = (a: ISODate, b: ISODate) => (a < b ? a : b)

/** 0 = Sunday … 6 = Saturday (same as Postgres extract(dow)). */
export function weekday(d: ISODate): number {
  return new Date(toUTC(d)).getUTCDay()
}

export function monthBounds(month: string): { start: ISODate; end: ISODate; days: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) throw new Error(`Invalid month: ${month}`)
  const y = +m[1], mo = +m[2]
  const days = daysInMonth(y, mo)
  return { start: fmt(y, mo, 1), end: fmt(y, mo, days), days }
}

export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}

/**
 * Parse dates typed by Indian users or found in Excel: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY,
 * ISO, or an Excel serial number. Never month-first. Two-digit years → 20YY.
 */
export function parseIndianDate(input: string | number | Date): ISODate | null {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null
    return fmt(input.getUTCFullYear(), input.getUTCMonth() + 1, input.getUTCDate())
  }
  if (typeof input === "number") return excelSerialToISO(input)
  const s = input.trim()
  if (/^\d+(\.\d+)?$/.test(s) && +s > 20000 && +s < 80000) return excelSerialToISO(+s)
  if (ISO_RE.test(s)) return isValidISODate(s) ? s : null
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s)
  if (!m) return null
  const d = +m[1], mo = +m[2]
  let y = +m[3]
  if (m[3].length === 2) y += 2000
  const iso = fmt(y, mo, d)
  return isValidISODate(iso) ? iso : null
}

/** Excel (1900 date system, with the Lotus leap-year bug) serial → ISO. */
export function excelSerialToISO(serial: number): ISODate | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  const days = Math.floor(serial)
  const ms = Date.UTC(1899, 11, 30) + days * 86_400_000
  const t = new Date(ms)
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

/** "5 Nov 2026" */
export function formatDateHuman(d: ISODate, locale = "en-IN"): string {
  const [y, m, day] = parts(d)
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, day)))
}

/** "3 min ago", "2 days ago" — for freshness labels. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? "" : "s"} ago`
}
