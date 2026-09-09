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
