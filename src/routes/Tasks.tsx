import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TaskRow } from '../components/TaskRow'
import { useTasks } from '../lib/api'
import { byUrgency, timeStateOf } from '../lib/time'
import type { Task, TimeState } from '../lib/types'

/**
 * /app/tasks — Figma node 35:118
 *
 * Grouped by time bucket, never by project. On any given morning the question
 * is "what is about to be late", not "which project is this". Projects are a
 * filter, not the spine.
 */

type Bucket = { key: string; label: string; note: string; alert?: boolean; tasks: Task[] }

export default function Tasks() {
  const { data, isPending, isError } = useTasks()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const filter = params.get('filter') ?? 'all'
  const now = new Date()

  const buckets = useMemo<Bucket[]>(() => {
    if (!data) return []
    const open = data.filter((t) => t.status !== 'CANCELLED')
    const matches = (t: Task) => {
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false
      if (filter === 'overdue') return timeStateOf(t, now) === 'late'
      if (filter === 'waiting') return t.status === 'WAITING'
      return true
    }
    const of = (s: TimeState) => open.filter((t) => matches(t) && timeStateOf(t, now) === s)
      .sort((a, b) => byUrgency(a, b, now))

    return [
      { key: 'late', label: 'เกินกำหนด', note: 'จัดการก่อนอย่างอื่น', alert: true, tasks: of('late') },
      { key: 'today', label: 'วันนี้', note: '', tasks: of('today') },
      { key: 'soon', label: 'สัปดาห์นี้', note: '', tasks: [...of('soon'), ...of('waiting')] },
      { key: 'none', label: 'ยังไม่มีกำหนด', note: 'ควรใส่กำหนดส่ง', tasks: of('none') },
      { key: 'done', label: 'เสร็จแล้ว', note: '', tasks: of('done') },
    ].filter((b) => b.tasks.length > 0)
  }, [data, filter, q])

  if (isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>
  if (isError) return <p className="t-body text-error">โหลดรายการงานไม่ได้</p>

  const total = data.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length
  const nothing = buckets.length === 0

  return (
    <>
      <p className="t-caption text-ink-3">งานทั้งหมด</p>
      <h1 className="t-page-title mt-1">รายการงาน</h1>
      <p className="t-body text-ink-2 mt-2">
        {total} งานที่ยังเปิดอยู่ · จัดกลุ่มตามเวลาที่เหลือ เพราะคำถามแรกของทุกเช้าคือ “อะไรจะสายก่อน”
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Chip active={filter === 'all'} onClick={() => setParams({})}>ทั้งหมด</Chip>
        <Chip active={filter === 'overdue'} onClick={() => setParams({ filter: 'overdue' })}>เกินกำหนด</Chip>
        <Chip active={filter === 'waiting'} onClick={() => setParams({ filter: 'waiting' })}>รอคนอื่น</Chip>
        <label className="ml-auto">
          <span className="sr-only">ค้นหางาน</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่องาน"
            className="w-60 rounded-control border border-rule bg-sheet px-3 py-1.5 text-[12px] placeholder:text-ink-3"
          />
        </label>
      </div>

      {nothing ? (
        <NoMatch onClear={() => { setParams({}); setQ('') }} filtered={filter !== 'all' || q !== ''} />
      ) : (
        buckets.map((b) => (
          <section key={b.key} className="mt-7">
            <header className="flex items-center justify-between">
              <h2 className={`t-label ${b.alert ? 'text-time-late' : 'text-ink-3'}`}>{b.label}</h2>
              <p className="t-meta text-ink-3">
                {b.tasks.length} งาน{b.note && ` — ${b.note}`}
              </p>
            </header>
            <div className="mt-2.5 overflow-hidden rounded-sheet border border-rule bg-sheet">
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

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-pill px-3.5 py-1.5 text-[12px]',
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
      <p className="t-body text-ink-2 mt-2 leading-relaxed">
        {filtered
          ? 'ลองเอาตัวกรองบางอันออก หรือค้นด้วยคำที่กว้างขึ้น'
          : 'บังคับแค่ชื่องานอย่างเดียว กำหนดส่งกับโปรเจกต์ค่อยมาเติมทีหลังได้'}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-control border border-rule px-4 py-2.5 text-[12.5px] font-medium"
        >
          ล้างตัวกรองทั้งหมด
        </button>
      )}
    </div>
  )
}
