import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '../lib/api'
import { clock, timeStateOf } from '../lib/time'
import { timeText } from '../lib/style'
import type { Task } from '../lib/types'
import { useNow } from '../lib/useNow'

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const TZ = 'Asia/Bangkok'

/** /app/calendar — Figma node 45:648 */
export default function Calendar() {
  const { data, isPending } = useTasks()
  const now = useNow()
  const [offset, setOffset] = useState(0)

  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const viewYear = view.getFullYear()
  const viewMonth = view.getMonth()

  // Cheap enough to just compute: 35 dates, once per render.
  const first = new Date(viewYear, viewMonth, 1)
  const gridStart = new Date(first)
  gridStart.setDate(1 - first.getDay()) // the grid starts on Sunday, Thai convention
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  if (isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>

  const dated = (data ?? []).filter((t) => t.dueAt && t.status !== 'CANCELLED')
  const undated = (data ?? []).filter((t) => !t.dueAt && t.status !== 'DONE' && t.status !== 'CANCELLED')

  const byDay = new Map<string, Task[]>()
  for (const t of dated) {
    const k = dayKey(new Date(t.dueAt!))
    byDay.set(k, [...(byDay.get(k) ?? []), t])
  }

  const monthLabel = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, month: 'long', year: 'numeric' })
    .format(view)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-ink-3">มุมมองปฏิทิน</p>
          <h1 className="t-page-title mt-1">{monthLabel}</h1>
          <p className="t-body text-ink-2 mt-2">
            วางตามกำหนดส่ง งานที่ไม่มีกำหนดจะไม่ปรากฏบนปฏิทินและจะไม่มีการเตือน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Nav onClick={() => setOffset((o) => o - 1)} label="เดือนก่อน">‹</Nav>
          <Nav onClick={() => setOffset(0)} label="กลับมาเดือนนี้" wide>วันนี้</Nav>
          <Nav onClick={() => setOffset((o) => o + 1)} label="เดือนถัดไป">›</Nav>
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
            const outside = d.getMonth() !== view.getMonth()
            const isToday = dayKey(d) === dayKey(now)
            const items = outside ? [] : (byDay.get(dayKey(d)) ?? [])
            return (
              <div
                key={i}
                className={[
                  'min-h-[136px] border-b border-r border-rule-soft p-2.5 last:border-r-0',
                  i % 7 === 6 ? 'border-r-0' : '',
                  i >= 28 ? 'border-b-0' : '',
                  isToday ? 'bg-ink/[0.045]' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[11.5px] ${outside ? 'text-rule' : isToday ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                    {d.getDate()}
                  </span>
                  {isToday && <span className="t-label text-ink">วันนี้</span>}
                </div>
                <div className="mt-1.5 space-y-1">
                  {items.slice(0, 2).map((t) => <Chip key={t.id} task={t} now={now} />)}
                  {items.length > 2 && (
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
          มีงานที่ยังไม่มีกำหนดส่ง {undated.length} งาน จึงไม่ขึ้นบนปฏิทิน{' '}
          <Link to="/app/tasks" className="underline">ดูรายการ</Link>
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
        <span className={`block font-mono text-[8.5px] ${timeText[state]}`}>{clock(task.dueAt!)}</span>
        <span className="block truncate text-[10.5px] leading-tight text-ink-2">{task.title}</span>
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
      className={`rounded-control border border-rule bg-sheet py-1.5 text-[12px] text-ink-2 ${wide ? 'px-3.5' : 'px-2.5'}`}
    >
      {children}
    </button>
  )
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
