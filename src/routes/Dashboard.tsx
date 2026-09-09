import { TimeRule } from '../components/TimeRule'
import { TaskRow } from '../components/TaskRow'
import { useTasks } from '../lib/api'
import { byUrgency, longDate, timeStateOf } from '../lib/time'
import type { Task } from '../lib/types'

/** /app/dashboard — Figma node 9:3 */
export default function Dashboard() {
  const { data, isPending, isError } = useTasks()
  const now = new Date()

  if (isPending) return <Skeleton />
  if (isError) return <LoadFailed />

  const open = data.filter((t) => t.status !== 'CANCELLED')
  const today = open
    .filter((t) => ['late', 'today', 'waiting'].includes(timeStateOf(t, now)) || t.status === 'DONE')
    .sort((a, b) => byUrgency(a, b, now))

  const inbox = data
    .filter((t) => t.status === 'INBOX')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return (
    <>
      <p className="t-caption text-ink-3">{longDate(now)}</p>
      <h1 className="t-page-title mt-1">วันนี้ต้องไม่หล่น</h1>
      <p className="t-body text-ink-2 mt-2">เรียงตามเวลาที่เหลือ ไม่ใช่ตามลำดับที่เพิ่ม</p>

      <div className="mt-6">
        <TimeRule tasks={open} now={now} />
      </div>

      <div className="mt-9 grid gap-8 xl:grid-cols-[1fr_344px]">
        <section>
          <header className="flex items-center justify-between">
            <h2 className="t-section">งานวันนี้</h2>
            <p className="t-caption text-ink-3">เรียงตามเวลาที่เหลือ</p>
          </header>
          {today.length === 0 ? (
            <Empty
              title="วันนี้ไม่มีอะไรค้าง"
              body="งานที่มีกำหนดส่งทั้งหมดยังอยู่ในเวลา เส้นเวลาด้านบนจะขึ้นสีเมื่อมีงานใกล้ครบกำหนด"
            />
          ) : (
            <div className="mt-4 overflow-hidden rounded-sheet border border-rule bg-sheet">
              {today.map((t, i) => (
                <TaskRow key={t.id} task={t} now={now} last={i === today.length - 1} />
              ))}
            </div>
          )}
        </section>

        <aside>
          <header className="flex items-center justify-between">
            <h2 className="t-section">กล่องรับงาน</h2>
            <p className="t-caption text-ink-3">ยังไม่ได้จัด {inbox.length}</p>
          </header>
          {inbox.length === 0 ? (
            <Empty
              title="กล่องรับงานว่างแล้ว"
              body="ทุกงานที่รับเข้ามามีกำหนดส่งและโปรเจกต์เรียบร้อย งานใหม่จะมารออยู่ตรงนี้"
            />
          ) : (
            <div className="mt-4 rounded-sheet border border-rule bg-sheet px-5">
              {inbox.slice(0, 4).map((t, i) => (
                <InboxItem key={t.id} task={t} now={now} last={i === Math.min(inbox.length, 4) - 1} />
              ))}
            </div>
          )}
          <p className="t-meta text-ink-3 mt-4 leading-relaxed">
            ค่าเริ่มต้นเตือนให้จัดกล่องรับงานเมื่อค้างเกิน 24 ชั่วโมง ปรับได้ในหน้าตั้งค่า
          </p>
        </aside>
      </div>
    </>
  )
}

/**
 * Inbox aging. The bar fills toward the 24h default and flips to the overdue
 * colour past it, so the state is readable without parsing the number — which is
 * the point of putting it on a dashboard at all.
 */
function InboxItem({ task, now, last }: { task: Task; now: Date; last: boolean }) {
  const hours = Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / 3_600_000)
  const over = hours > 24
  const fill = Math.min(hours / 24, 1) * 100

  return (
    <div className={`py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <p className="text-[13.5px] leading-snug">{task.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className={`t-caption ${over ? 'text-time-late' : 'text-ink-3'}`}>
          อยู่ในกล่อง {hours} ชม.
        </span>
        {over && <span className="t-meta text-time-late">เกินเวลาจัด</span>}
      </div>
      <div className="mt-2 h-0.5 w-full bg-rule-soft">
        <div
          className={`h-full ${over ? 'bg-time-late' : 'bg-ink-3/55'}`}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-sheet border border-rule bg-sheet px-7 py-11">
      <p className="t-section">{title}</p>
      <p className="t-body text-ink-2 mt-2 leading-relaxed">{body}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-40 bg-ink/10" />
      <div className="mt-3 h-9 w-72 bg-ink/10" />
      <div className="mt-6 h-[214px] rounded-sheet bg-ink/[0.06]" />
      <div className="mt-9 space-y-px overflow-hidden rounded-sheet border border-rule bg-sheet">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex h-row items-center gap-4 px-5">
            <div className="h-2.5 w-14 bg-ink/10" />
            <div className="h-3 bg-ink/10" style={{ width: `${240 - i * 22}px` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadFailed() {
  return (
    <div className="rounded-sheet border border-error/35 bg-error/[0.07] px-6 py-5">
      <p className="text-[14px] font-semibold text-error">ต่อเซิร์ฟเวอร์ไม่ได้</p>
      <p className="t-body text-ink-2 mt-1.5 leading-relaxed">
        เช็คการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่ · งานที่เพิ่มไว้ก่อนหน้าถูกบันทึกแล้ว ไม่หาย
      </p>
    </div>
  )
}
