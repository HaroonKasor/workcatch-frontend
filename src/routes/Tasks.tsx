import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TaskRow } from '../components/TaskRow'
import { FilterMenu } from '../components/FilterMenu'
import { Skeleton as Block, SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../components/Skeleton'
import { useProjects, useTasks } from '../lib/api'
import { priorityLabel, statusLabel } from '../lib/style'
import { byUrgency, timeStateOf } from '../lib/time'
import type { Priority, Task, TimeState } from '../lib/types'
import { useNow } from '../lib/useNow'
import { useIsDesktop } from '../lib/useMedia'
import { MobileHeader } from '../components/mobile/MobileHeader'
import { TasksMobile } from '../components/mobile/TasksMobile'
import { MobileListSkeleton, MobileLoadError } from '../components/mobile/States'

/**
 * /app/tasks — Figma v2 423:747 (desktop), 423:3188 (phone); v1 35:118
 *
 * Grouped by time bucket, never by project. On any given morning the question
 * is "what is about to be late", not "which project is this". Projects are a
 * filter, not the spine.
 *
 * The filter row is five controls - the frame's own list (v2 423:747), compact
 * pills that open the shared FilterMenu rather than native <select>s, whose
 * option lists the operating system draws in its own type. The chosen value
 * replaces the control's own name, so the row states what is currently being
 * filtered instead of only offering to filter.
 *
 * Being overdue sits inside the status control even though it is a time state
 * rather than a status: it is what people mean when they ask what state a task
 * is in, and the rail deep-links to it.
 */

/** One filter's worth of URL state. Empty string means "not filtering on this". */
interface Filters {
  status: string
  project: string
  priority: string
  source: string
}

type Bucket = { key: string; label: string; alert?: boolean; tasks: Task[] }

/** CANCELLED is deliberately absent: this list never shows cancelled work. */
const STATUSES: Task['status'][] = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE']
const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

export default function Tasks() {
  const { data, isPending, isError, refetch } = useTasks()
  const projects = useProjects()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const now = useNow()
  const desktop = useIsDesktop()

  // `filter=overdue|waiting` is the older spelling the rail used. Reading it
  // here keeps every existing deep link and bookmark working while the row
  // itself speaks one language.
  const legacy = params.get('filter')
  const f: Filters = {
    status: params.get('status') ?? (legacy === 'overdue' ? 'overdue' : legacy === 'waiting' ? 'WAITING' : ''),
    project: params.get('project') ?? '',
    priority: params.get('priority') ?? '',
    source: params.get('source') ?? '',
  }
  const filtering = Object.values(f).some((v) => v !== '') || q !== ''

  const set = (key: keyof Filters, value: string) => {
    const next: Record<string, string> = { ...f, [key]: value }
    // Writing the new spelling drops the old one, so the two can never both sit
    // in the URL saying different things.
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '')))
  }

  const buckets = useMemo<Bucket[]>(() => {
    if (!data) return []
    const open = data.filter((t) => t.status !== 'CANCELLED')
    const matches = (t: Task) => {
      // The box says it searches the requester and the source, so it does.
      const hay = [t.title, t.requester ?? '', t.source ?? ''].join(' ').toLowerCase()
      if (q && !hay.includes(q.toLowerCase())) return false
      if (f.status === 'overdue' && timeStateOf(t, now) !== 'late') return false
      if (f.status !== '' && f.status !== 'overdue' && t.status !== f.status) return false
      if (f.project !== '' && t.project?.id !== f.project) return false
      if (f.priority !== '' && t.priority !== f.priority) return false
      if (f.source !== '' && (t.source ?? '') !== f.source) return false
      return true
    }
    const of = (s: TimeState) => open.filter((t) => matches(t) && timeStateOf(t, now) === s)
      .sort((a, b) => byUrgency(a, b, now))

    return [
      { key: 'late', label: 'เกินกำหนด', alert: true, tasks: of('late') },
      { key: 'today', label: 'วันนี้', tasks: of('today') },
      { key: 'soon', label: 'สัปดาห์นี้', tasks: of('soon') },
      // Figma v2 423:747 gives waiting work its own group: it is not late and
      // not soon, it is somebody else's move.
      { key: 'waiting', label: 'รอคนอื่น', tasks: of('waiting') },
      { key: 'none', label: 'ยังไม่มีกำหนด', tasks: of('none') },
      { key: 'done', label: 'เสร็จแล้ว', tasks: of('done') },
    ].filter((b) => b.tasks.length > 0)
  }, [data, f.status, f.project, f.priority, f.source, q, now])

  if (isPending) return desktop ? <TasksSkeleton /> : <MobileListSkeleton title="งาน" label="กำลังโหลดรายการงาน" />
  if (isError) return desktop ? <p className="t-body text-error">โหลดรายการงานไม่ได้</p> : <><MobileHeader title="งาน" /><MobileLoadError title="โหลดงานไม่สำเร็จ" onRetry={() => void refetch()} /></>

  const total = data.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length
  const nothing = buckets.length === 0
  // The source list is whatever actually came in, never a hardcoded enum: an
  // option that can only ever return nothing is worse than no option.
  const sources = [...new Set(data.map((t) => t.source).filter((x): x is string => !!x))].sort()

  if (!desktop) {
    return (
      <TasksMobile
        buckets={buckets}
        total={total}
        matching={buckets.reduce((n, b) => n + b.tasks.length, 0)}
        f={f}
        set={set}
        projects={(projects.data ?? []).filter((p) => !p.archivedAt)}
        sources={sources}
        filtering={filtering}
        clear={() => { setParams({}); setQ('') }}
        now={now}
      />
    )
  }

  return (
    <>
      <p className="t-caption text-ink-3">งานทั้งหมด</p>
      <h1 className="t-page-title mt-1">รายการงาน</h1>
      <p className="sr-only">{total} งานที่ยังเปิดอยู่ จัดกลุ่มตามเวลาที่เหลือ</p>

      <div className="mt-[35px] flex flex-wrap items-center gap-2">
        <Chip active={!filtering} onClick={() => { setParams({}); setQ('') }}>ทั้งหมด</Chip>
        <FilterMenu
          name="สถานะ"
          value={f.status}
          onChange={(v) => set('status', v)}
          options={[
            { value: 'overdue', label: 'เกินกำหนด' },
            ...STATUSES.map((k) => ({ value: k, label: statusLabel[k] })),
          ]}
        />
        <FilterMenu
          name="โปรเจกต์"
          value={f.project}
          onChange={(v) => set('project', v)}
          options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterMenu
          name="ความสำคัญ"
          value={f.priority}
          onChange={(v) => set('priority', v)}
          options={PRIORITIES.map((k) => ({ value: k, label: priorityLabel[k] }))}
        />
        <FilterMenu
          name="ที่มา"
          value={f.source}
          onChange={(v) => set('source', v)}
          options={sources.map((x) => ({ value: x, label: x }))}
        />
        {/* The phone's tab bar has no calendar slot any more, so the other views
            of the same list are reached from here — the grouping the desktop rail
            already uses under มุมมอง. Not on the frame, which was drawn at 1440
            where the rail carries them; they are hidden from lg up for that reason. */}
        <Link
          to="/app/calendar"
          className="wc-lift flex min-h-11 items-center rounded-pill border border-rule bg-sheet px-3.5 text-[12px] text-ink-2 lg:hidden"
        >
          ปฏิทิน
        </Link>
        <Link
          to="/app/board"
          className="wc-lift flex min-h-11 items-center rounded-pill border border-rule bg-sheet px-3.5 text-[12px] text-ink-2 lg:hidden"
        >
          บอร์ด
        </Link>
        {/* First on a phone (v2 423:3188), last on a desktop (423:747). */}
        <label className="order-first w-full min-w-0 lg:order-none lg:w-auto lg:flex-1 lg:basis-56 lg:max-w-[264px]">
          <span className="sr-only">ค้นหาชื่องาน ผู้สั่ง หรือที่มา</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่องาน ผู้สั่ง หรือที่มา"
            className="min-h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[12px] placeholder:text-ink-3 lg:min-h-[31px]"
          />
        </label>
      </div>

      {nothing ? (
        <NoMatch onClear={() => { setParams({}); setQ('') }} filtered={filtering} />
      ) : (
        buckets.map((b) => (
          <section key={b.key} className="mt-7">
            <header className="flex items-center justify-between">
              <h2 className={`t-label ${b.alert ? 'text-time-late' : 'text-ink-3'}`}>{b.label}</h2>
              <p className="t-meta text-ink-3">{b.tasks.length} งาน</p>
            </header>
            <div className="@container mt-2.5 overflow-hidden rounded-sheet border border-rule bg-sheet">
              {b.tasks.map((t, i) => (
                <TaskRow key={t.id} task={t} now={now} last={i === b.tasks.length - 1} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}

/** Header, filter row, then two sheets of rows — the shape of the real page. */
function TasksSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดรายการงาน">
      <SkeletonPageHeader />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[64, 72, 82, 90, 62].map((w) => (
          <Block key={w} w={`${w}px`} h="31px" className="rounded-pill" />
        ))}
      </div>
      <Block w="88px" h="11px" className="mt-7" />
      <SkeletonRows rows={4} className="mt-2.5" />
      <Block w="70px" h="11px" className="mt-7" />
      <SkeletonRows rows={3} className="mt-2.5" />
    </SkeletonScreen>
  )
}

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'wc-lift min-h-11 rounded-pill px-3.5 text-[12px] lg:min-h-[31px] lg:px-3',
        active ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/**
 * "Nothing matched your filter" is a different situation from "you have no
 * tasks", and saying the wrong one sends people looking for a bug.
 */
function NoMatch({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="mt-7 rounded-sheet border border-rule bg-sheet px-7 py-11">
      <p className="t-section">{filtered ? 'ไม่มีงานที่ตรงกับตัวกรอง' : 'ยังไม่มีงานในระบบ'}</p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="wc-lift mt-5 rounded-control border border-rule px-4 py-2.5 text-[12.5px] font-medium"
        >
          ล้างตัวกรองทั้งหมด
        </button>
      )}
    </div>
  )
}
