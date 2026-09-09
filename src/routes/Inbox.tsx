import { useTasks } from '../lib/api'
import type { Task } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/inbox — Figma node 34:2
 *
 * This screen has one job: turn raw captures into scheduled work. So every card
 * shows the two fields that are missing as dashed empty slots. The screen states
 * what is left to decide instead of just listing what came in.
 */
export default function Inbox() {
  const { data, isPending } = useTasks()
  const now = useNow()

  if (isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>

  const items = (data ?? [])
    .filter((t) => t.status === 'INBOX')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const bySource = items.reduce<Record<string, number>>((acc, t) => {
    const k = t.source ?? 'พิมพ์เอง'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const maxSource = Math.max(1, ...Object.values(bySource))

  return (
    <>
      <p className="t-caption text-ink-3">กล่องรับงาน</p>
      <h1 className="t-page-title mt-1">
        {items.length === 0 ? 'กล่องรับงานว่างแล้ว' : `จัด ${items.length} งานเข้าที่`}
      </h1>
      <p className="t-body text-ink-2 mt-2">
        งานที่ยังไม่มีกำหนดส่งหรือโปรเจกต์ — ค้างเกิน 24 ชั่วโมงเมื่อไหร่ ระบบจะเตือนให้มาจัด
      </p>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-sheet border border-rule bg-sheet px-7 py-11">
              <p className="t-section">ทุกงานมีที่อยู่แล้ว</p>
              <p className="t-body text-ink-2 mt-2 leading-relaxed">
                งานใหม่ที่รับเข้ามาจะมารออยู่ตรงนี้ กด เพิ่มงาน เพื่อบันทึกงานถัดไป
              </p>
            </div>
          ) : (
            items.map((t) => <TriageCard key={t.id} task={t} now={now} />)
          )}
        </div>

        <aside className="min-w-0">
          <header className="flex items-center justify-between">
            <h2 className="t-section">งานเข้ามาจากไหน</h2>
            <p className="t-caption text-ink-3">ที่ยังไม่ได้จัด</p>
          </header>
          <div className="mt-4 rounded-sheet border border-rule bg-sheet px-5">
            {Object.entries(bySource).map(([name, n], i, arr) => (
              <div key={name} className={`py-3.5 ${i === arr.length - 1 ? '' : 'border-b border-rule-soft'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px]">{name}</span>
                  <span className="font-mono text-[11px] text-ink-2">{n}</span>
                </div>
                <div className="mt-2 h-[3px] w-full bg-rule-soft">
                  <div className="h-full bg-ink/50" style={{ width: `${(n / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}

function TriageCard({ task, now }: { task: Task; now: Date }) {
  const hours = Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / 3_600_000)
  const over = hours > 24

  return (
    <article className="rounded-sheet border border-rule bg-sheet px-5 pb-4 pt-4.5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[15px] font-medium leading-snug">{task.title}</h3>
        {task.source && <span className="t-caption shrink-0 text-ink-3">จาก {task.source}</span>}
      </div>

      {/* Dashed means "not filled in yet" — the same language as Quick Add. */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Slot>กำหนดส่ง</Slot>
        <Slot>โปรเจกต์</Slot>
        <Slot>รอคนอื่น</Slot>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className={`t-caption ${over ? 'text-time-late' : 'text-ink-3'}`}>
            อยู่ในกล่อง {hours} ชม.
          </span>
          {over && <span className="t-meta text-time-late">เกินเวลาจัด</span>}
        </div>
        <div className="mt-2 h-0.5 w-full bg-rule-soft">
          <div
            className={`h-full ${over ? 'bg-time-late' : 'bg-ink-3/50'}`}
            style={{ width: `${Math.min(hours / 24, 1) * 100}%` }}
          />
        </div>
      </div>
    </article>
  )
}

function Slot({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-control border border-dashed border-ink-3 px-3 py-1.5 text-[11.5px] text-ink-3 hover:border-ink-2 hover:text-ink-2"
    >
      <span className="font-mono">+</span>
      {children}
    </button>
  )
}
