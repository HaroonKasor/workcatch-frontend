import { useRef, useState } from 'react'
import { useProjects } from '../../lib/api'
import { priorityLabel, projectDot, statusLabel } from '../../lib/style'
import type { Priority, Task, TaskStatus } from '../../lib/types'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { MobileHeader } from './MobileHeader'
import { TaskSwipeRow } from './SwipeRow'
import { useRowActions } from './useRowActions'

/**
 * บอร์ด on a phone — Figma 466:780. The six desktop columns become a strip of
 * tabs over a row of swipeable pages: a tab scrolls to its column, swiping the
 * page moves the tab, and the dots say how many there are. The inbox has its own
 * tab in the bottom bar, so it is not a column here.
 */
const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE']

export function BoardMobile({ tasks: all, now }: { tasks: Task[]; now: Date }) {
  const projects = useProjects()
  const [filtering, setFiltering] = useState(false)
  const [project, setProject] = useState('')
  const [priority, setPriority] = useState('')
  const tasks = all.filter((t) => (!project || t.project?.id === project) && (!priority || t.priority === priority))
  const narrowed = project !== '' || priority !== ''
  const actions = useRowActions()
  const pages = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const go = (i: number) => {
    const el = pages.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    setActive(i)
  }

  return (
    <div className="lg:hidden">
      <MobileHeader title="บอร์ด" actions={[{ icon: 'filter', label: 'ตัวกรอง', onClick: () => setFiltering(true) }]} />
      <div role="tablist" aria-label="สถานะ" className="no-scrollbar flex overflow-x-auto border-b border-rule-soft px-2">
        {COLUMNS.map((status, i) => {
          const n = tasks.filter((t) => t.status === status).length
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => go(i)}
              className={`-mb-px flex min-h-11 shrink-0 items-baseline gap-1.5 border-b-2 px-3 pt-2.5 pb-2 text-[15px] ${active === i ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-3'}`}
            >
              {statusLabel[status]}
              <span className="font-mono text-[13px]">{n}</span>
            </button>
          )
        })}
      </div>

      <div
        ref={pages}
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / el.clientWidth)
          if (i !== active) setActive(i)
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {COLUMNS.map((status) => {
          const items = tasks.filter((t) => t.status === status)
          return (
            <section key={status} aria-label={statusLabel[status]} className="w-full shrink-0 snap-center px-3 py-3">
              <div className="min-h-[200px] overflow-hidden rounded-sheet border border-rule bg-sheet">
                <h2 className="flex items-baseline gap-2 border-b border-rule-soft px-4 py-3 text-[15px] font-medium">
                  {statusLabel[status]}
                  <span className="font-mono text-[13px] text-ink-3">{items.length}</span>
                </h2>
                <ul>
                  {items.map((t) => (
                    <TaskSwipeRow key={t.id} task={t} now={now} actions={actions} swipe={false} />
                  ))}
                </ul>
                {items.length === 0 && <p className="px-4 py-6 text-[14px] text-ink-3">ไม่มีงาน</p>}
              </div>
            </section>
          )
        })}
      </div>

      <div className="flex justify-center gap-1.5 pb-2" aria-hidden>
        {COLUMNS.map((c, i) => (
          <span key={c} className={`size-1.5 rounded-full ${active === i ? 'bg-ink' : 'bg-rule'}`} />
        ))}
      </div>
      {actions.sheet}
      <BottomSheet
        open={filtering}
        onClose={() => setFiltering(false)}
        title="ตัวกรอง"
        aside={narrowed ? <button type="button" onClick={() => { setProject(''); setPriority('') }} className="flex min-h-11 items-center px-1 text-[14px] text-ink-2">ล้าง</button> : undefined}
        footer={<button type="button" onClick={() => setFiltering(false)} className="wc-lift min-h-12 w-full rounded-control bg-brand-strong text-[16px] font-medium text-on-dark">แสดง {tasks.filter((t) => t.status !== 'INBOX' && t.status !== 'CANCELLED').length} งาน</button>}
      >
        <div className="space-y-5 px-4 pb-2">
          <fieldset>
            <legend className="mb-2 text-[14px] text-ink-3">โปรเจกต์</legend>
            <div className="flex flex-wrap gap-2">
              {(projects.data ?? []).filter((p) => !p.archivedAt).map((p) => (
                <Chip key={p.id} on={project === p.id} onClick={() => setProject(project === p.id ? '' : p.id)} dot={projectDot[p.color]}>{p.name}</Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[14px] text-ink-3">ความสำคัญ</legend>
            <div className="flex flex-wrap gap-2">
              {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((k) => (
                <Chip key={k} on={priority === k} onClick={() => setPriority(priority === k ? '' : k)}>{priorityLabel[k]}</Chip>
              ))}
            </div>
          </fieldset>
        </div>
      </BottomSheet>
    </div>
  )
}

function Chip({ on, onClick, dot, children }: { on: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-11 items-center gap-2 rounded-control border px-3.5 text-[14px] ${on ? 'border-brand bg-selected font-medium' : 'border-rule bg-sheet'}`}
    >
      {on && <Icon name="check" size={16} className="text-brand-strong" />}
      {dot && <span className={`size-2 rounded-full ${dot}`} aria-hidden />}
      {children}
    </button>
  )
}
