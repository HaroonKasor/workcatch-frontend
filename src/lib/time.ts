import type { Task, TimeState } from './types'

/**
 * The core of the product lives here.
 *
 * Every colour on every screen comes from timeStateOf(), and so does the sort
 * order of every list. If this function is wrong, the app is confidently wrong
 * everywhere at once — so it is deliberately small, pure, and takes `now` as an
 * argument so it can be tested at any instant.
 */

const BANGKOK = 'Asia/Bangkok'

/** Calendar day in the user's zone, not UTC. 23:30 UTC is already tomorrow here. */
function localDayKey(iso: string, timeZone = BANGKOK): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}

export function timeStateOf(task: Task, now: Date = new Date(), timeZone = BANGKOK): TimeState {
  if (task.status === 'DONE' || task.status === 'CANCELLED') return 'done'
  if (task.status === 'WAITING') return 'waiting'
  if (!task.dueAt) return 'none'

  const due = new Date(task.dueAt)
  if (due.getTime() < now.getTime()) return 'late'

  const nowIso = now.toISOString()
  if (localDayKey(task.dueAt, timeZone) === localDayKey(nowIso, timeZone)) return 'today'

  // Anything inside the next seven days is "soon"; further out reads as neutral,
  // because colouring a deadline three weeks away teaches people to ignore colour.
  const days = (due.getTime() - now.getTime()) / 86_400_000
  return days <= 7 ? 'soon' : 'none'
}

/** Lists are ordered by how little time is left, never by when a task was added. */
const ORDER: Record<TimeState, number> = {
  late: 0, today: 1, soon: 2, none: 3, waiting: 4, done: 5,
}

export function byUrgency(a: Task, b: Task, now: Date = new Date()): number {
  const d = ORDER[timeStateOf(a, now)] - ORDER[timeStateOf(b, now)]
  if (d !== 0) return d
  if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt)
  if (a.dueAt) return -1
  if (b.dueAt) return 1
  return a.createdAt.localeCompare(b.createdAt)
}

/**
 * What goes in the monospace gutter. Short enough to fit 112px, and phrased the
 * way a person would say it out loud rather than as a raw timestamp.
 */
export function gutterLabel(task: Task, now: Date = new Date(), timeZone = BANGKOK): string {
  if (task.status === 'DONE') {
    return task.completedAt ? `เสร็จ ${clock(task.completedAt, timeZone)}` : 'เสร็จแล้ว'
  }
  if (task.status === 'CANCELLED') return 'ยกเลิก'

  if (task.status === 'WAITING') {
    if (!task.followUpAt) return 'รออยู่'
    const d = wholeDaysBetween(now.toISOString(), task.followUpAt, timeZone)
    return d <= 0 ? 'ถึงวันตาม' : `รอ ${d} วัน`
  }

  if (!task.dueAt) return 'ไม่มีกำหนด'

  const overdueDays = wholeDaysBetween(task.dueAt, now.toISOString(), timeZone)
  if (new Date(task.dueAt) < now) {
    return overdueDays >= 1 ? `เกิน ${overdueDays} วัน` : 'เลยเวลาแล้ว'
  }

  const inDays = wholeDaysBetween(now.toISOString(), task.dueAt, timeZone)
  if (inDays === 0) return clock(task.dueAt, timeZone)
  if (inDays === 1) return `พรุ่งนี้ ${clock(task.dueAt, timeZone)}`
  if (inDays <= 6) return `${weekday(task.dueAt, timeZone)} ${clock(task.dueAt, timeZone)}`
  return shortDate(task.dueAt, timeZone)
}

function wholeDaysBetween(fromIso: string, toIso: string, timeZone: string): number {
  const a = Date.parse(`${localDayKey(fromIso, timeZone)}T00:00:00Z`)
  const b = Date.parse(`${localDayKey(toIso, timeZone)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

export function clock(iso: string, timeZone = BANGKOK): string {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))
}

function weekday(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('th-TH', { timeZone, weekday: 'short' })
    .format(new Date(iso)).replace('วัน', '')
}

function shortDate(iso: string, timeZone = BANGKOK): string {
  // th-TH uses the Buddhist calendar by default, which is what the design shows.
  return new Intl.DateTimeFormat('th-TH', { timeZone, day: 'numeric', month: 'short' })
    .format(new Date(iso))
}

/** "อังคาร 8 กันยายน 2569" — the eyebrow above every page title. */
export function longDate(d: Date = new Date(), timeZone = BANGKOK): string {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d).replace('วัน', '')
}

export function timeLeft(dueIso: string, now: Date = new Date()): string {
  const ms = new Date(dueIso).getTime() - now.getTime()
  if (ms <= 0) return 'เลยกำหนดแล้ว'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return `เหลืออีก ${Math.floor(h / 24)} วัน ${h % 24} ชั่วโมง`
  if (h >= 1) return `เหลืออีก ${h} ชั่วโมง ${m} นาที`
  return `เหลืออีก ${m} นาที`
}

/**
 * "2 วันก่อน" — how long ago something was last touched.
 *
 * Notes have no deadline, so nothing about them can be late and none of the
 * time colours apply. The only temporal fact a note carries is staleness, and
 * staleness is answered in the units a person thinks in: an edit from this
 * morning is "3 ชั่วโมงก่อน", one from last quarter is "3 เดือนก่อน". Printing
 * an exact date for both would make the reader do the subtraction.
 */
export function sinceLabel(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (ms < 60_000) return 'เมื่อสักครู่'

  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes} นาทีก่อน`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงก่อน`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} วันก่อน`

  const weeks = Math.floor(days / 7)
  if (days < 30) return `${weeks} สัปดาห์ก่อน`

  const months = Math.floor(days / 30)
  // Thai drops the "1": "เดือนก่อน" is last month, "1 เดือนก่อน" reads as a count.
  if (months < 12) return months === 1 ? 'เดือนก่อน' : `${months} เดือนก่อน`

  const years = Math.floor(days / 365)
  return years === 1 ? 'ปีก่อน' : `${years} ปีก่อน`
}

/** "อีก 83 วัน" — the countdown on a review date, which is a whole-day affair. */
export function daysUntilLabel(iso: string, now: Date = new Date()): string {
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000)
  if (days < 0) return `เลยวันทบทวนมา ${Math.abs(days)} วัน`
  if (days === 0) return 'ถึงกำหนดทบทวนวันนี้'
  return `อีก ${days} วัน`
}

/**
 * "6 ก.ย. 2569 10:22" — a date and its clock.
 *
 * For a fact that is a MOMENT rather than a day: when a task was created, when a
 * file was attached. The long weekday form belongs on a page eyebrow, where
 * there is room for it; in a two-column property row it wraps onto three lines
 * and buries the value it is supposed to state.
 */
export function stamp(iso: string, timeZone = BANGKOK): string {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone, day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))
}

/**
 * "2026-09-08T17:00" — an instant as a `datetime-local` input wants it.
 *
 * Deliberately the BROWSER's wall clock rather than Bangkok's, because that is
 * what the input itself will hand back and what QuickAdd already assumes when
 * it does `new Date(dueAt).toISOString()`. Two conventions for the same field
 * would put a task's deadline seven hours out depending on which screen typed
 * it, which is the one mistake this product cannot afford to make.
 */
export function localInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The inverse. Returns null for anything a `datetime-local` cannot resolve. */
export function fromLocalInput(local: string): string | null {
  const at = new Date(local)
  return Number.isNaN(at.getTime()) ? null : at.toISOString()
}

/** "1 ธันวาคม 2569" — a date with no clock, because a review date has no hour. */
export function fullDate(iso: string, timeZone = BANGKOK): string {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone, day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

/** An instant at a wall-clock hour in Bangkok, `days` from today. */
export function bangkokAt(days: number, hour: number, now = new Date()): Date {
  const bangkok = new Date(now.getTime() + 7 * 3_600_000)
  return new Date(Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), bangkok.getUTCDate() + days, hour) - 7 * 3_600_000)
}
