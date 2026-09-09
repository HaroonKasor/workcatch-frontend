import { Link, useParams } from 'react-router-dom'
import { useTask } from '../lib/api'
import { clock, longDate, timeLeft, timeStateOf } from '../lib/time'
import { projectDot, statusLabel, timeText } from '../lib/style'

/**
 * /app/tasks/:id — Figma node 37:389
 *
 * The hero fact of this screen is the deadline, not a status badge. Every other
 * task app leads with status; this one leads with how much time is left, because
 * that is the thing that decides whether you act now.
 */
export default function TaskDetail() {
  const { id } = useParams()
  const { data: task, isPending, isError } = useTask(id)
  const now = new Date()

  if (isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>
  if (isError || !task) return <p className="t-body text-error">ไม่พบงานนี้</p>

  const state = timeStateOf(task, now)

  return (
    <>
      <p className="t-caption text-ink-3">
        <Link to="/app/tasks" className="hover:text-ink-2">รายการงาน</Link>
        {task.project && <> {'  ›  '} {task.project.name}</>}
      </p>
      <h1 className="font-display text-[32px] font-semibold leading-[1.3] tracking-[-0.6px] mt-1.5">
        {task.title}
      </h1>

      {task.dueAt ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={`h-[26px] w-[3px] ${state === 'late' ? 'bg-time-late' : 'bg-time-today'}`} aria-hidden />
          <span className={`font-mono text-[15px] font-semibold ${timeText[state]}`}>
            {state === 'late' ? 'เลยกำหนดแล้ว' : `ครบกำหนด ${clock(task.dueAt)}`}
          </span>
          <span className="t-body text-ink-2">{timeLeft(task.dueAt, now)}</span>
        </div>
      ) : (
        <p className="t-body text-ink-2 mt-4">
          งานนี้ยังไม่มีกำหนดส่ง จึงจะไม่มีการเตือนใดๆ จนกว่าจะใส่วันให้
        </p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div>
          <Section title="รายละเอียด">
            <p className="t-body text-ink-2 px-5 py-4 leading-[1.75]">
              {task.description ?? 'ยังไม่ได้ใส่รายละเอียด'}
            </p>
          </Section>

          <Section title="ประวัติการเปลี่ยนแปลง" note="เก็บทุกการเปลี่ยนสถานะและข้อมูลสำคัญ" className="mt-8">
            <Row when={`สร้างเมื่อ ${longDate(new Date(task.createdAt))}`} what={`จาก ${task.source ?? 'เว็บ'}`} last={!task.completedAt} />
            {task.completedAt && (
              <Row when={`ปิดงาน ${clock(task.completedAt)}`} what="เปลี่ยนสถานะเป็น เสร็จ" last />
            )}
          </Section>
        </div>

        <aside className="space-y-8">
          <div className="space-y-2.5">
            <button type="button" className="w-full rounded-control bg-ink py-3 text-[13px] font-medium text-on-dark">
              ปิดงานนี้
            </button>
            <button type="button" className="w-full rounded-control border border-rule bg-sheet py-3 text-[13px] font-medium">
              เปลี่ยนสถานะ
            </button>
          </div>

          <Section title="ข้อมูลงาน">
            <Prop k="สถานะ" v={statusLabel[task.status]} />
            <Prop k="ความสำคัญ" v={task.priority} bold={task.priority === 'URGENT'} />
            {task.project && (
              <Prop k="โปรเจกต์" v={task.project.name} dot={projectDot[task.project.color]} />
            )}
            {task.requester && <Prop k="ผู้สั่ง" v={task.requester} />}
            {task.waitingFor && <Prop k="รอ" v={task.waitingFor} />}
            <Prop k="ที่มา" v={task.source ?? 'เว็บ'} mono last />
          </Section>

          <p className="t-meta text-ink-3 leading-relaxed">
            ปิดงานแล้วการเตือนที่ยังไม่ส่งจะถูกยกเลิกอัตโนมัติ
          </p>
        </aside>
      </div>
    </>
  )
}

function Section({ title, note, className = '', children }: {
  title: string; note?: string; className?: string; children: React.ReactNode
}) {
  return (
    <section className={className}>
      <header className="flex items-center justify-between">
        <h2 className="t-section">{title}</h2>
        {note && <p className="t-caption text-ink-3">{note}</p>}
      </header>
      <div className="mt-3 rounded-sheet border border-rule bg-sheet">{children}</div>
    </section>
  )
}

function Prop({ k, v, dot, mono, bold, last }: {
  k: string; v: string; dot?: string; mono?: boolean; bold?: boolean; last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="t-meta text-ink-3">{k}</span>
      <span className="flex items-center gap-2">
        {dot && <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />}
        <span className={mono ? 'font-mono text-[11px]' : `text-[12.5px] ${bold ? 'font-semibold' : ''}`}>{v}</span>
      </span>
    </div>
  )
}

function Row({ when, what, last }: { when: string; what: string; last?: boolean }) {
  return (
    <div className={`flex gap-4 px-5 py-3 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="t-caption w-40 shrink-0 text-ink-3">{when}</span>
      <span className="t-body text-ink-2">{what}</span>
    </div>
  )
}
