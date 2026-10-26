import { useState } from 'react'
import { useTasks } from '../../lib/api'
import { timeText } from '../../lib/style'
import { clock, timeStateOf } from '../../lib/time'
import type { Task } from '../../lib/types'
import { useNow } from '../../lib/useNow'
import { Icon } from './Icon'
import { MobileHeader } from './MobileHeader'
import { ListGroup, TaskSwipeRow } from './SwipeRow'
import { useRowActions } from './useRowActions'

/**
 * ปฏิทิน on a phone — Figma 466:901 (month) and 466:1163 (week).
 *
 * Month: a grid of numbers with up to three dots under a day, each dot the colour
 * of that task's time state, and the chosen day's tasks listed beneath. Week:
 * a strip of seven days and every day's tasks stacked under its own heading.
 */
const TZ = 'Asia/Bangkok'
const INITIALS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const heading = (d: Date) => new Intl.DateTimeFormat('th-TH', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(d)

export function CalendarMobile() {
  const { data } = useTasks()
  const now = useNow()
  const actions = useRowActions()
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [offset, setOffset] = useState(0)
  const [picked, setPicked] = useState(dayKey(now))
  const week = mode === 'week'

  const view = week
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset * 7)
    : new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const start = new Date(view)
  if (!week) start.setDate(1 - view.getDay())
  const cells = Array.from({ length: week ? 7 : 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const byDay = new Map<string, Task[]>()
  for (const t of (data ?? []).filter((t) => t.dueAt && t.status !== 'CANCELLED')) {
    const k = dayKey(new Date(t.dueAt!))
    byDay.set(k, [...(byDay.get(k) ?? []), t].sort((a, b) => a.dueAt!.localeCompare(b.dueAt!)))
  }
  const label = week
    ? `${cells[0].getDate()} – ${new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(cells[6])}`
    : new Intl.DateTimeFormat('th-TH', { timeZone: TZ, month: 'long', year: 'numeric' }).format(view)
  const today = dayKey(now)

  const row = (t: Task) => (
    <TaskSwipeRow key={t.id} task={t} now={now} actions={actions} lead={clock(t.dueAt!)} leadClass={timeText[timeStateOf(t, now)]} swipe={t.status !== 'DONE'} />
  )

  return (
    <div className="lg:hidden">
      <MobileHeader title="ปฏิทิน" />
      <div className="px-4">
        <div role="group" aria-label="มุมมอง" className="grid grid-cols-2 rounded-control bg-ground p-1 text-center text-[15px]">
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => { setMode(m); setOffset(0); setPicked(today) }}
              className={`min-h-11 rounded-[6px] ${mode === m ? 'bg-sheet font-medium shadow-[var(--wc-press-shadow)]' : 'text-ink-2'}`}
            >
              {m === 'month' ? 'เดือน' : 'สัปดาห์'}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-medium">{label}</h2>
          <div className="flex items-center">
            <button type="button" onClick={() => { setOffset(0); setPicked(today) }} className="mr-1 min-h-11 rounded-control border border-rule bg-sheet px-3.5 text-[14px]">วันนี้</button>
            <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label={week ? 'สัปดาห์ก่อน' : 'เดือนก่อน'} className="flex size-11 items-center justify-center"><Icon name="chevronLeft" /></button>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label={week ? 'สัปดาห์ถัดไป' : 'เดือนถัดไป'} className="flex size-11 items-center justify-center"><Icon name="chevronRight" /></button>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 px-2 text-center">
        {INITIALS.map((d) => <span key={d} className="py-1.5 text-[13px] text-ink-3">{d}</span>)}
        {cells.map((d) => {
          const k = dayKey(d)
          const outside = !week && d.getMonth() !== view.getMonth()
          const items = outside ? [] : byDay.get(k) ?? []
          const on = picked === k
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              aria-label={`${heading(d)} ${items.length} งาน`}
              onClick={() => setPicked(k)}
              className={`flex ${week ? 'flex-col gap-0.5 py-2' : 'min-h-12 flex-col items-center py-1'} items-center justify-center`}
            >
              <span className={`flex size-9 items-center justify-center rounded-full text-[16px] ${on ? 'bg-ink font-semibold text-on-dark' : k === today ? 'font-semibold text-brand-strong' : outside ? 'text-rule' : ''}`}>
                {d.getDate()}
              </span>
              {!week && (
                <span className="flex h-1.5 gap-0.5" aria-hidden>
                  {items.slice(0, 3).map((t) => (
                    <span key={t.id} className={`size-1.5 rounded-full ${timeText[timeStateOf(t, now)].replace('text-', 'bg-')}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-2 border-t border-rule">
        {week
          ? cells.map((d) => {
              const k = dayKey(d)
              const items = byDay.get(k) ?? []
              if (items.length === 0 && k !== today) return null
              return (
                <ListGroup key={k} label={k === today ? `${heading(d)} · วันนี้` : heading(d)} count={items.length}>
                  {items.map(row)}
                </ListGroup>
              )
            })
          : (
            <ListGroup label={heading(new Date(`${picked}T12:00:00+07:00`))} count={(byDay.get(picked) ?? []).length}>
              {(byDay.get(picked) ?? []).map(row)}
            </ListGroup>
          )}
      </div>
      {actions.sheet}
    </div>
  )
}
