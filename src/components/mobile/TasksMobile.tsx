import { useState } from 'react'
import { Link } from 'react-router-dom'
import { priorityLabel, projectDot, statusLabel } from '../../lib/style'
import { clock } from '../../lib/time'
import type { Priority, Project, Task } from '../../lib/types'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { MobileHeader } from './MobileHeader'
import { ListGroup, TaskSwipeRow } from './SwipeRow'
import { useRowActions } from './useRowActions'

/**
 * งาน on a phone — Figma 458:113 (the list, mid-swipe) and 465:839 (ตัวกรอง).
 *
 * The same buckets the desktop list uses; the phone only splits "this week" into
 * tomorrow and the rest, because tomorrow is the day people check. Search and the
 * filters sit behind two icons in the top bar so the list starts at the top.
 */

export interface Bucket { key: string; label: string; tasks: Task[] }

export interface FilterState {
  status: string
  project: string
  priority: string
  source: string
}

const STATUSES: Task['status'][] = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE']
const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const dayKey = (d: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(d))

export function TasksMobile({ buckets, total, matching, f, set, projects, sources, filtering, clear, now }: {
  buckets: Bucket[]
  total: number
  matching: number
  f: FilterState
  set: (key: keyof FilterState, value: string) => void
  projects: Project[]
  sources: string[]
  filtering: boolean
  clear: () => void
  now: Date
}) {
  const actions = useRowActions()
  const [filters, setFilters] = useState(false)
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000))

  // "สัปดาห์นี้" becomes พรุ่งนี้ plus whatever is left of it.
  const groups: { key: string; label: string; tone?: 'late' | 'waiting'; tasks: Task[]; lead: 'days' | 'clock' | 'gutter' | 'none' }[] = []
  for (const b of buckets) {
    if (b.key === 'soon') {
      const next = b.tasks.filter((t) => t.dueAt && dayKey(t.dueAt) === tomorrow)
      const rest = b.tasks.filter((t) => !next.includes(t))
      if (next.length) groups.push({ key: 'tomorrow', label: 'พรุ่งนี้', tasks: next, lead: 'clock' })
      if (rest.length) groups.push({ key: 'week', label: 'สัปดาห์นี้', tasks: rest, lead: 'gutter' })
    } else {
      groups.push({
        key: b.key,
        label: b.label,
        tone: b.key === 'late' ? 'late' : b.key === 'waiting' ? 'waiting' : undefined,
        tasks: b.tasks,
        lead: b.key === 'today' ? 'clock' : b.key === 'none' ? 'none' : 'gutter',
      })
    }
  }

  return (
    <div className="lg:hidden">
      <MobileHeader
        title="งาน"
        count={total}
        actions={[
          { icon: 'search', label: 'ค้นหา', onClick: () => document.dispatchEvent(new Event('wc:open-search')) },
          { icon: 'filter', label: 'ตัวกรอง', onClick: () => setFilters(true) },
        ]}
      />

      {groups.length === 0 ? (
        <div className="border-t border-rule bg-sheet px-4 py-8">
          <p className="text-[16px] font-medium">{filtering ? 'ไม่มีงานที่ตรงกับตัวกรอง' : 'ยังไม่มีงานในระบบ'}</p>
          {filtering && (
            <button type="button" onClick={clear} className="wc-lift mt-4 min-h-11 rounded-control border border-rule px-4 text-[14px] font-medium">
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      ) : (
        groups.map((g) => (
          <ListGroup key={g.key} label={g.label} count={g.tasks.length} tone={g.tone}>
            {g.tasks.map((t) => (
              <TaskSwipeRow
                key={t.id}
                task={t}
                now={now}
                actions={actions}
                swipe={t.status !== 'DONE'}
                lead={g.lead === 'clock' && t.dueAt ? clock(t.dueAt) : g.lead === 'none' ? '–' : undefined}
                leadClass={g.key === 'waiting' ? 'text-time-waiting' : undefined}
              />
            ))}
          </ListGroup>
        ))
      )}

      <FilterSheet
        open={filters}
        onClose={() => setFilters(false)}
        f={f}
        set={set}
        projects={projects}
        sources={sources}
        matching={matching}
        filtering={filtering}
        clear={clear}
      />
      {actions.sheet}
    </div>
  )
}

/** ตัวกรอง — Figma 465:839. One choice per group; tap it again to let go. */
function FilterSheet({ open, onClose, f, set, projects, sources, matching, filtering, clear }: {
  open: boolean
  onClose: () => void
  f: FilterState
  set: (key: keyof FilterState, value: string) => void
  projects: Project[]
  sources: string[]
  matching: number
  filtering: boolean
  clear: () => void
}) {
  const toggle = (key: keyof FilterState, value: string) => set(key, f[key] === value ? '' : value)
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="ตัวกรอง"
      aside={filtering ? <button type="button" onClick={clear} className="flex min-h-11 items-center px-1 text-[14px] text-ink-2">ล้าง</button> : undefined}
      footer={
        <button type="button" onClick={onClose} className="wc-lift min-h-12 w-full rounded-control bg-brand-strong text-[16px] font-medium text-on-dark">
          แสดง {matching} งาน
        </button>
      }
    >
      <div className="space-y-5 px-4 pb-2">
        <Field label="มุมมอง">
          <div className="grid w-full grid-cols-3 rounded-control bg-ground p-1 text-center text-[14px]">
            <span className="rounded-[6px] bg-sheet py-2.5 font-medium" aria-current="page">รายการ</span>
            <Link to="/app/board" onClick={onClose} className="flex items-center justify-center py-2.5 text-ink-2">บอร์ด</Link>
            <Link to="/app/calendar" onClick={onClose} className="flex items-center justify-center py-2.5 text-ink-2">ปฏิทิน</Link>
          </div>
        </Field>
        <Field label="สถานะ">
          {[{ value: 'overdue', label: 'เกินกำหนด' }, ...STATUSES.map((k) => ({ value: k as string, label: statusLabel[k] }))].map((o) => (
            <Chip key={o.value} on={f.status === o.value} onClick={() => toggle('status', o.value)}>{o.label}</Chip>
          ))}
        </Field>
        {projects.length > 0 && (
          <Field label="โปรเจกต์">
            {projects.map((p) => (
              <Chip key={p.id} on={f.project === p.id} onClick={() => toggle('project', p.id)} dot={projectDot[p.color]}>{p.name}</Chip>
            ))}
          </Field>
        )}
        <Field label="ความสำคัญ">
          {PRIORITIES.map((k) => (
            <Chip key={k} on={f.priority === k} onClick={() => toggle('priority', k)}>{priorityLabel[k]}</Chip>
          ))}
        </Field>
        {sources.length > 0 && (
          <Field label="ที่มา">
            {sources.map((x) => (
              <Chip key={x} on={f.source === x} onClick={() => toggle('source', x)}>{x}</Chip>
            ))}
          </Field>
        )}
      </div>
    </BottomSheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] text-ink-3">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
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
