import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '../lib/api'
import { clock, timeStateOf } from '../lib/time'
import { timeText } from '../lib/style'
import type { Task } from '../lib/types'
import { useNow } from '../lib/useNow'
import { useIsDesktop } from '../lib/useMedia'
import { CalendarMobile } from '../components/mobile/CalendarMobile'
import { Skeleton as Block, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const TZ = 'Asia/Bangkok'

/** /app/calendar — Figma v2 423:1115 (month, with the week toggle); v1 45:648 */
/** The month grid, at the same 7 columns and 6 rows it settles into. */
function CalendarSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดปฏิทิน">
      <SkeletonPageHeader />
      <div className="mt-7 grid grid-cols-7 gap-px overflow-hidden rounded-sheet border border-rule bg-rule">
        {Array.from({ length: 42 }, (_, i) => (
          <div key={i} className="min-h-[92px] bg-sheet p-2">
            <Block w="18px" h="10px" />
            {i % 4 === 0 && <Block w="80%" h="10px" className="mt-2.5" />}
          </div>
        ))}
      </div>
    </SkeletonScreen>
  )
}

export default function Calendar() {
  const desktop = useIsDesktop()
  return desktop ? <CalendarDesktop /> : <CalendarMobile />
}

function CalendarDesktop() {
  const { data, isPending } = useTasks()
  const now = useNow()
  const [offset, setOffset] = useState(0)
  // เดือน / สัปดาห์ — v2 423:1115. The offset counts months or weeks.
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const week = mode === 'week'

  const view = week
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset * 7)
    : new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const viewYear = view.getFullYear()
  const viewMonth = view.getMonth()

  // Cheap enough to just compute: 35 dates (or 7), once per render.
  const first = new Date(viewYear, viewMonth, week ? view.getDate() : 1)
  const gridStart = new Date(first)
  if (!week) gridStart.setDate(1 - first.getDay()) // the grid starts on Sunday, Thai convention
  const cells = Array.from({ length: week ? 7 : 35 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  if (isPending) return <CalendarSkeleton />

  const dated = (data ?? []).filter((t) => t.dueAt && t.status !== 'CANCELLED')
  const undated = (data ?? []).filter((t) => !t.dueAt && t.status !== 'DONE' && t.status !== 'CANCELLED')

  const byDay = new Map<string, Task[]>()
  for (const t of dated) {
    const k = dayKey(new Date(t.dueAt!))
    byDay.set(k, [...(byDay.get(k) ?? []), t])
  }

  const monthLabel = week
    ? `${cells[0].getDate()} – ${new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(cells[6])}`
    : new Intl.DateTimeFormat('th-TH', { timeZone: TZ, month: 'long', year: 'numeric' }).format(view)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-ink-3">มุมมองปฏิทิน</p>
          <h1 className="t-page-title mt-1">{monthLabel}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Nav onClick={() => setOffset((o) => o - 1)} label={week ? 'สัปดาห์ก่อน' : 'เดือนก่อน'}>‹</Nav>
          <Nav onClick={() => setOffset(0)} label={week ? 'กลับมาสัปดาห์นี้' : 'กลับมาเดือนนี้'} wide>วันนี้</Nav>
          <Nav onClick={() => setOffset((o) => o + 1)} label={week ? 'สัปดาห์ถัดไป' : 'เดือนถัดไป'}>›</Nav>
          <div role="group" aria-label="มุมมอง" className="ml-3 flex gap-1.5">
            {(['month', 'week'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m)
                  setOffset(0)
                }}
                className={`wc-lift min-h-9 rounded-control px-3.5 text-[12px] ${mode === m ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2'}`}
              >
                {m === 'month' ? 'เดือน' : 'สัปดาห์'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-sheet border border-rule bg-sheet">
        <div className="grid grid-cols-7 border-b border-rule">
          {DAYS.map((d) => (
            <div key={d} className="px-3 py-2.5">
              <span className="t-label text-ink-3">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const outside = !week && d.getMonth() !== view.getMonth()
            const isToday = dayKey(d) === dayKey(now)
            const items = outside ? [] : (byDay.get(dayKey(d)) ?? [])
            return (
              <div
                key={i}
                className={[
                  `${week ? 'min-h-[420px]' : 'min-h-[136px]'} border-b border-r border-rule-soft p-2.5 last:border-r-0`,
                  i % 7 === 6 ? 'border-r-0' : '',
                  week || i >= 28 ? 'border-b-0' : '',
                  isToday ? 'bg-selected' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[12px] ${outside ? 'text-rule' : isToday ? 'font-semibold text-brand-strong' : 'text-ink-2'}`}>
                    {d.getDate()}
                  </span>
                  {isToday && <span className="t-label text-brand-strong">วันนี้</span>}
                </div>
                <div className="mt-1.5 space-y-1">
                  {items.slice(0, week ? items.length : 2).map((t) => <Chip key={t.id} task={t} now={now} />)}
                  {!week && items.length > 2 && (
                    <p className="t-meta text-ink-3">+ อีก {items.length - 2} งาน</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="t-meta text-ink-3 mt-4">
          <Link to="/app/tasks" className="underline">ยังไม่มีกำหนดส่ง {undated.length} งาน</Link>
        </p>
      )}
    </>
  )
}

function Chip({ task, now }: { task: Task; now: Date }) {
  const state = timeStateOf(task, now)
  return (
    <Link to={`/app/tasks/${task.id}`} className="flex overflow-hidden rounded-[2px]">
      <span className={`w-hair shrink-0 ${state === 'none' ? 'bg-ink-3' : timeText[state].replace('text-', 'bg-')}`} aria-hidden />
      <span className="min-w-0 flex-1 pl-1.5">
        <span className={`block font-mono text-[12px] ${timeText[state]}`}>{clock(task.dueAt!)}</span>
        <span className="block truncate text-[12px] leading-tight text-ink-2">{task.title}</span>
      </span>
    </Link>
  )
}

function Nav({ onClick, label, wide, children }: {
  onClick: () => void; label: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`wc-lift rounded-control border border-rule bg-sheet py-1.5 text-[12px] text-ink-2 ${wide ? 'px-3.5' : 'px-2.5'}`}
    >
      {children}
    </button>
  )
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
