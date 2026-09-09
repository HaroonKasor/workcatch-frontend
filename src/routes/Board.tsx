import { useTasks } from '../lib/api'
import { gutterLabel, timeStateOf } from '../lib/time'
import { priorityTitle, projectDot, statusLabel, timeText, timeWeight } from '../lib/style'
import { Link } from 'react-router-dom'
import type { Task, TaskStatus } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/board — Figma node 44:567
 *
 * Colour on a card still means time, never status. The column already says the
 * status; spending colour on it twice would leave nothing to say "this is about
 * to be late", which is the only thing colour is for here.
 */
const COLUMNS: TaskStatus[] = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE']

export default function Board() {
  const { data, isPending } = useTasks()
  const now = useNow()
  if (isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>

  const tasks = data ?? []

  return (
    <>
      <p className="t-caption text-ink-3">มุมมองบอร์ด</p>
      <h1 className="t-page-title mt-1">บอร์ด</h1>
      <p className="t-body text-ink-2 mt-2">
        ลากการ์ดเพื่อเปลี่ยนสถานะ · สีบนการ์ดยังบอกเรื่องเวลาเหมือนเดิม ไม่ได้บอกสถานะ เพราะคอลัมน์บอกอยู่แล้ว
      </p>

      <div className="mt-7 flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const items = tasks.filter((t) => t.status === status)
          return (
            <section key={status} className="w-44 shrink-0">
              <header className="flex items-center justify-between pb-1.5">
                <h2 className="text-[12.5px] font-medium">{statusLabel[status]}</h2>
                <span className="font-mono text-[10.5px] text-ink-3">{items.length}</span>
              </header>
              <div className="h-px w-full bg-rule" />
              <div className="mt-2.5 space-y-2.5">
                {items.map((t) => <Card key={t.id} task={t} now={now} />)}
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded-sheet border border-dashed border-ink-3 px-3 py-2.5 text-[11.5px] text-ink-3 hover:text-ink-2"
                >
                  <span className="font-mono">+</span> เพิ่มงาน
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

function Card({ task, now }: { task: Task; now: Date }) {
  const state = timeStateOf(task, now)
  const dim = state === 'done'
  return (
    <Link
      to={`/app/tasks/${task.id}`}
      className={`flex overflow-hidden rounded-sheet border border-rule bg-sheet ${dim ? 'opacity-55' : ''}`}
    >
      <span className={`w-hair shrink-0 ${state === 'none' || dim ? 'bg-transparent' : timeText[state].replace('text-', 'bg-')}`} aria-hidden />
      <span className="min-w-0 flex-1 px-3 py-2.5">
        <span className={`block ${timeWeight[state]} ${timeText[state]}`}>{gutterLabel(task, now)}</span>
        <span className={`mt-1.5 block text-[12.5px] leading-snug ${priorityTitle[task.priority].replace('14px', '')}`}>
          {task.title}
        </span>
        {task.project && (
          <span className="t-meta text-ink-3 mt-1.5 flex items-center gap-1.5 truncate">
            <span className={`size-1.5 shrink-0 rounded-full ${projectDot[task.project.color]}`} aria-hidden />
            <span className="truncate">{task.project.name}</span>
          </span>
        )}
      </span>
    </Link>
  )
}
