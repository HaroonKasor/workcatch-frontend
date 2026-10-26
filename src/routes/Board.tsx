import { useTasks } from '../lib/api'
import { useQuickAdd } from '../components/QuickAdd'
import { Skeleton as Block, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { gutterLabel, timeStateOf } from '../lib/time'
import { priorityTitle, projectDot, statusLabel, timeText, timeWeight } from '../lib/style'
import { Link } from 'react-router-dom'
import type { Task, TaskStatus } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/board — Figma v2 423:941; v1 44:567
 *
 * Colour on a card still means time, never status. The column already says the
 * status; spending colour on it twice would leave nothing to say "this is about
 * to be late", which is the only thing colour is for here.
 */
const COLUMNS: TaskStatus[] = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE']

/** Six columns of cards, at the column width the real board uses. */
function BoardSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดบอร์ด">
      <SkeletonPageHeader />
      <div className="mt-7 flex gap-3 overflow-hidden pb-4">
        {COLUMNS.map((c, i) => (
          <div key={c} className="w-44 shrink-0">
            <Block w="76px" h="13px" />
            <div className="mt-2 h-px w-full bg-rule" />
            <div className="mt-2.5 space-y-2.5">
              {Array.from({ length: 3 - (i % 2) }, (_, j) => (
                <Block key={j} w="100%" h="72px" className="rounded-sheet" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  )
}

export default function Board() {
  const { data, isPending } = useTasks()
  const now = useNow()
  const quickAdd = useQuickAdd()
  if (isPending) return <BoardSkeleton />

  const tasks = data ?? []

  return (
    <>
      <p className="t-caption text-ink-3">มุมมองบอร์ด</p>
      <h1 className="t-page-title mt-1">บอร์ด</h1>
      {/* v2 423:941: no standfirst. How to use the board is said where it is
          used — to screen readers here, and by the cards themselves. */}
      <p className="sr-only">ลากการ์ดเพื่อเปลี่ยนสถานะ</p>

      <div className="mt-[33px] flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const items = tasks.filter((t) => t.status === status)
          return (
            <section key={status} className="w-44 shrink-0">
              <header className="flex items-center justify-between pb-1.5">
                <h2 className="text-[12.5px] font-medium">{statusLabel[status]}</h2>
                <span className="font-mono text-[12px] text-ink-3">{items.length}</span>
              </header>
              <div className="h-px w-full bg-rule" />
              <div className="mt-2.5 space-y-2.5">
                {items.map((t) => <Card key={t.id} task={t} now={now} />)}
                <button
                  type="button"
                  onClick={quickAdd.open}
                  className="wc-lift flex w-full items-center gap-1.5 rounded-sheet border border-dashed border-ink-3 px-3 py-2.5 text-[12px] text-ink-3 hover:text-ink-2"
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
  // An undated inbox card says how long it has waited to be sorted (v2 423:941),
  // late past the 24-hour mark, rather than a "no deadline" every inbox card
  // would otherwise share.
  const hours = Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / 3_600_000)
  const aging = task.status === 'INBOX' && !task.dueAt
  const state = aging ? (hours > 24 ? 'late' : 'none') : timeStateOf(task, now)
  const dim = state === 'done'
  return (
    <Link
      to={`/app/tasks/${task.id}`}
      className={`wc-lift flex overflow-hidden rounded-sheet border border-rule bg-sheet ${dim ? 'opacity-55' : ''}`}
    >
      <span className={`w-hair shrink-0 ${state === 'none' || dim ? 'bg-transparent' : timeText[state].replace('text-', 'bg-')}`} aria-hidden />
      <span className="min-w-0 flex-1 px-3 py-2.5">
        <span className={`block ${timeWeight[state]} ${timeText[state]}`}>{aging ? `${hours} ชม.` : gutterLabel(task, now)}</span>
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
