import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { priorityTitle, timeText, timeWeight } from '../../lib/style'
import { gutterLabel, timeStateOf } from '../../lib/time'
import type { Task } from '../../lib/types'
import { Icon } from './Icon'
import { useRowActions } from './useRowActions'

/**
 * A row you can swipe — Figma 458:113. Left postpones, right closes, and both are
 * undone from a toast.
 *
 * Swipe is a shortcut, never the only way: the same two actions are real buttons
 * inside the row, invisible until they take focus, so a keyboard or a screen
 * reader reaches them with Tab or by swiping to the next element. The row's own
 * link still opens the task.
 *
 * `touch-action: pan-y` leaves vertical scrolling to the browser; a gesture only
 * becomes a swipe once it has moved 8px sideways further than it moved down.
 */

const REVEAL = 140
const COMMIT = 80

export function SwipeRow({ children, onPostpone, onClose, subject }: {
  children: React.ReactNode
  onPostpone: () => void
  onClose: () => void
  /** The task's title, for the accessible names of the two buttons. */
  subject: string
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const locked = useRef(false)
  const moved = useRef(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)

  const finish = () => {
    if (!start.current) return
    const was = dx
    start.current = null
    locked.current = false
    setDragging(false)
    setDx(0)
    if (was <= -COMMIT) onPostpone()
    else if (was >= COMMIT) onClose()
  }

  return (
    <li className="relative overflow-hidden border-b border-rule-soft bg-sheet">
      {/* The two things underneath, drawn only as far as the row has moved. */}
      <div aria-hidden className="absolute inset-y-0 left-0 flex items-center justify-center bg-brand-strong text-on-dark" style={{ width: Math.max(0, dx) }}>
        {dx > 56 && <span className="flex flex-col items-center gap-0.5 text-[13px] font-medium"><Icon name="check" size={22} />ปิดงาน</span>}
      </div>
      <div aria-hidden className="absolute inset-y-0 right-0 flex items-center justify-center bg-time-soon-strong text-on-dark" style={{ width: Math.max(0, -dx) }}>
        {dx < -56 && <span className="flex flex-col items-center gap-0.5 text-[13px] font-medium"><Icon name="clock" size={22} />เลื่อน</span>}
      </div>

      <div
        className="relative touch-pan-y bg-sheet select-none motion-reduce:transition-none"
        // A link is draggable by default, and a native drag cancels the pointer.
        onDragStart={(e) => e.preventDefault()}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : 'transform 180ms ease-out' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
          locked.current = false
          moved.current = false
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s || s.id !== e.pointerId) return
          const mx = e.clientX - s.x
          const my = e.clientY - s.y
          if (!locked.current) {
            if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(my)) return
            locked.current = true
            moved.current = true
            setDragging(true)
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          setDx(Math.max(-REVEAL, Math.min(REVEAL, mx)))
        }}
        onPointerUp={finish}
        onPointerCancel={() => { start.current = null; locked.current = false; setDragging(false); setDx(0) }}
        // A drag that ends over the title must not also open the task.
        onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false } }}
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-2 opacity-0 focus-within:pointer-events-auto focus-within:opacity-100">
        <button type="button" onClick={onPostpone} className="flex min-h-11 items-center rounded-control border border-rule bg-sheet px-3 text-[14px] font-medium">
          เลื่อน<span className="sr-only"> {subject}</span>
        </button>
        <button type="button" onClick={onClose} className="flex min-h-11 items-center rounded-control bg-brand-strong px-3 text-[14px] font-medium text-on-dark">
          ปิดงาน<span className="sr-only"> {subject}</span>
        </button>
      </div>
    </li>
  )
}

/**
 * One ledger row on a phone: the time in a mono gutter, the title at 16px, then
 * project and requester underneath at 13. `lead` and `meta` override the gutter
 * and the second line where a screen says something more specific.
 */
export function TaskSwipeRow({ task, now, lead, leadClass, meta, metaClass, done, swipe = true, actions }: {
  task: Task
  now: Date
  lead?: string
  leadClass?: string
  meta?: React.ReactNode
  metaClass?: string
  done?: boolean
  swipe?: boolean
  actions: ReturnType<typeof useRowActions>
}) {
  const state = timeStateOf(task, now)
  const second = meta ?? [task.project?.name, task.requester].filter(Boolean).join(' · ')

  const body = (
    <Link to={`/app/tasks/${task.id}`} className="flex min-h-[64px] items-start gap-3 px-4 py-3">
      <span className={`w-[60px] shrink-0 pt-[3px] font-mono text-[13px] leading-[1.45] ${leadClass ?? `${timeWeight[state]} ${timeText[state]}`}`}>
        {lead ?? gutterLabel(task, now).replace(/^เกิน /, '')}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] leading-[1.35] ${done ? 'text-ink-3 line-through' : priorityTitle[task.priority]}`}>{task.title}</span>
        {second && <span className={`mt-0.5 block truncate text-[13px] leading-[1.4] ${metaClass ?? 'text-ink-3'}`}>{second}</span>}
      </span>
    </Link>
  )

  if (!swipe) return <li className="border-b border-rule-soft bg-sheet">{body}</li>
  return (
    <SwipeRow subject={task.title} onPostpone={() => actions.postpone(task)} onClose={() => actions.close(task)}>
      {body}
    </SwipeRow>
  )
}

/** A titled run of rows: a grey band with the name and its count, then the rows. */
export function ListGroup({ label, count, tone, hideCount, children }: {
  label: string
  count: number
  hideCount?: boolean
  tone?: 'late' | 'waiting'
  children: React.ReactNode
}) {
  const colour = tone === 'late' ? 'text-time-late' : tone === 'waiting' ? 'text-time-waiting' : 'text-ink-2'
  return (
    <section>
      <h2 className={`flex items-baseline gap-2 border-t border-rule bg-ground px-4 pt-4 pb-2.5 text-[14px] font-medium ${colour}`}>
        {label}
        {!hideCount && <span className="font-mono">{count}</span>}
      </h2>
      <ul className="border-t border-rule">{children}</ul>
    </section>
  )
}
