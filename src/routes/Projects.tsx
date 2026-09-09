import { Link } from 'react-router-dom'
import { useProjects, useTasks } from '../lib/api'
import { gutterLabel, timeStateOf } from '../lib/time'
import { projectDot, timeText } from '../lib/style'
import type { Project, Task } from '../lib/types'
import { useNow } from '../lib/useNow'

/** /app/projects — Figma node 46:729 */
export default function Projects() {
  const projects = useProjects()
  const tasks = useTasks()
  const now = useNow()

  if (projects.isPending || tasks.isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>

  const all = tasks.data ?? []

  return (
    <>
      <p className="t-caption text-ink-3">โปรเจกต์ทั้งหมด</p>
      <h1 className="t-page-title mt-1">โปรเจกต์</h1>
      <p className="t-body text-ink-2 mt-2">
        สีของโปรเจกต์ใช้ได้เฉพาะโทนเย็น เพื่อไม่ให้ชนกับสีที่บอกเรื่องเวลา
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(projects.data ?? []).map((p) => (
          <Card key={p.id} project={p} tasks={all.filter((t) => t.project?.id === p.id)} now={now} />
        ))}
        <button
          type="button"
          className="flex min-h-[168px] flex-col items-center justify-center gap-1.5 rounded-sheet border border-dashed border-ink-3 px-5 py-5 text-ink-2 hover:border-ink-2"
        >
          <span className="text-[13.5px] font-medium">+ สร้างโปรเจกต์</span>
          <span className="t-meta text-ink-3">เลือกสีได้จาก 6 สีโทนเย็น</span>
        </button>
      </div>
    </>
  )
}

function Card({ project, tasks, now }: { project: Project; tasks: Task[]; now: Date }) {
  const open = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
  const overdue = open.filter((t) => timeStateOf(t, now) === 'late')
  const done = tasks.filter((t) => t.status === 'DONE')

  // The next deadline is the only thing on this card allowed a warm colour.
  const next = [...open]
    .filter((t) => t.dueAt)
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0]
  const nextState = next ? timeStateOf(next, now) : null

  const total = open.length + done.length
  const progress = total > 0 ? (done.length / total) * 100 : 100

  return (
    <Link
      to={`/app/tasks?project=${project.id}`}
      className="rounded-sheet border border-rule bg-sheet px-5 py-4.5"
    >
      <div className="flex items-center gap-2.5">
        <span className={`size-2.5 shrink-0 rounded-full ${projectDot[project.color]}`} aria-hidden />
        <h2 className="truncate text-[15px] font-medium">{project.name}</h2>
      </div>

      <dl className="mt-4 flex">
        <Stat label="ค้างอยู่" value={open.length} />
        <Stat label="เกินกำหนด" value={overdue.length} tone={overdue.length > 0 ? 'text-time-late' : 'text-ink-3'} />
        <Stat label="เสร็จแล้ว" value={done.length} tone="text-ink-3" />
      </dl>

      <div className="mt-4 h-[3px] w-full bg-rule-soft">
        <div className="h-full bg-ink/45" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="t-meta text-ink-3">กำหนดส่งถัดไป</span>
        <span className={`font-mono text-[10.5px] ${nextState ? timeText[nextState] : 'text-ink-3'}`}>
          {next ? gutterLabel(next, now) : 'ไม่มีงานค้าง'}
        </span>
      </div>
    </Link>
  )
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex-1">
      <dt className="t-meta text-ink-3">{label}</dt>
      <dd className={`font-mono text-[17px] font-semibold leading-tight ${tone}`}>{value}</dd>
    </div>
  )
}
