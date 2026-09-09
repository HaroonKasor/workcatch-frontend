import { clock, timeStateOf } from '../lib/time'
import { timeText } from '../lib/style'
import type { Task } from '../lib/types'

/**
 * The signature element — Figma node 10:5.
 *
 * Replaces the four stat cards every task app opens with. A single horizontal
 * rule with a "now" marker: work you have already missed sits to the LEFT of
 * now, because it is behind you, and what is coming sits to the right, spaced by
 * how soon it lands. One glance answers "what is about to bite me", which four
 * counters never do.
 *
 * Tick thickness encodes priority. Tick colour encodes time state. Nothing here
 * is decorative.
 */

const NOW_X = 27 // percent — the past gets a quarter of the rule, the day gets the rest

export function TimeRule({ tasks, now }: { tasks: Task[]; now: Date }) {
  const overdue = tasks.filter((t) => timeStateOf(t, now) === 'late')
  const dueToday = tasks
    .filter((t) => timeStateOf(t, now) === 'today')
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))

  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)
  const msLeft = Math.max(endOfDay.getTime() - now.getTime(), 1)

  const upcoming = dueToday.map((t) => {
    const ratio = (new Date(t.dueAt!).getTime() - now.getTime()) / msLeft
    return { task: t, x: NOW_X + Math.min(Math.max(ratio, 0), 1) * (100 - NOW_X - 4) }
  })

  // Most overdue furthest left. Spread evenly rather than by true elapsed time:
  // one task three weeks late would otherwise squash everything else together.
  const past = overdue.map((t, i) => ({
    task: t,
    x: 4 + (overdue.length === 1 ? 10 : (i / Math.max(overdue.length - 1, 1)) * (NOW_X - 10)),
  }))

  const counts = {
    late: overdue.length,
    today: dueToday.length,
    waiting: tasks.filter((t) => timeStateOf(t, now) === 'waiting').length,
    inbox: tasks.filter((t) => t.status === 'INBOX').length,
  }

  return (
    <section className="rounded-sheet border border-rule bg-sheet" aria-label="เส้นเวลาวันนี้">
      <div className="px-7 pt-5">
        <p className="t-label text-ink-3">เส้นเวลาวันนี้</p>
      </div>

      <div className="relative mx-7 mt-4 h-[120px]">
        {counts.late > 0 && (
          <p className="t-meta text-time-late absolute left-0 top-0">
            เกินกำหนด {counts.late} งาน
          </p>
        )}

        {/* The axis. Crimson behind you, neutral ahead of you. */}
        <div className="absolute left-0 right-0 top-[76px] h-px bg-rule" />
        <div
          className="absolute top-[76px] h-px bg-time-late/45"
          style={{ left: 0, width: `${NOW_X}%` }}
        />

        {past.map(({ task, x }) => (
          <Tick key={task.id} x={x} task={task} now={now} />
        ))}
        {upcoming.map(({ task, x }) => (
          <Tick key={task.id} x={x} task={task} now={now} label={clock(task.dueAt!)} />
        ))}

        {/* Now. The only full-height mark on the rule. */}
        <div
          className="absolute w-0.5 bg-ink"
          style={{ left: `${NOW_X}%`, top: 32, height: 74 }}
          aria-hidden
        />
        <span
          className="t-label absolute -translate-x-1/2 text-ink"
          style={{ left: `${NOW_X}%`, top: 16 }}
        >
          ตอนนี้
        </span>
        <span
          className="t-time-em absolute -translate-x-1/2 text-ink"
          style={{ left: `${NOW_X}%`, top: 100 }}
        >
          {clock(now.toISOString())}
        </span>
      </div>

      <div className="mx-7 mt-2 border-t border-rule-soft" />
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 px-7 py-3.5">
        <Count label="เกินกำหนด" value={counts.late} tone="bg-time-late text-time-late" />
        <Count label="ครบกำหนดวันนี้" value={counts.today} tone="bg-time-today text-time-today" />
        <Count label="รอคนอื่น" value={counts.waiting} tone="bg-time-waiting text-time-waiting" />
        <Count label="กล่องรับงาน" value={counts.inbox} tone="bg-ink-3 text-ink-3" />
      </dl>
    </section>
  )
}

function Tick({ x, task, now, label }: { x: number; task: Task; now: Date; label?: string }) {
  const state = timeStateOf(task, now)
  // Urgent work gets a visibly thicker mark. Same encoding as the title weight.
  const w = task.priority === 'URGENT' ? 3 : task.priority === 'HIGH' ? 2 : 1
  const bg = state === 'late' ? 'bg-time-late' : state === 'today' ? 'bg-time-today' : 'bg-time-soon'

  return (
    <>
      <div
        className={`absolute ${bg}`}
        style={{ left: `${x}%`, top: 46, width: w, height: 31, transform: 'translateX(-50%)' }}
        title={task.title}
      />
      <div
        className={`absolute size-[5px] ${bg}`}
        style={{ left: `${x}%`, top: 41, transform: 'translateX(-50%)' }}
        aria-hidden
      />
      {label && (
        <span
          className={`t-caption absolute -translate-x-1/2 ${task.priority === 'URGENT' ? timeText[state] : 'text-ink-2'}`}
          style={{ left: `${x}%`, top: 84 }}
        >
          {label}
        </span>
      )}
    </>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  const [dot, text] = tone.split(' ')
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-1 ${dot}`} aria-hidden />
      <dt className="t-meta text-ink-2">{label}</dt>
      <dd className={`font-mono text-[11px] font-semibold ${text}`}>{value}</dd>
    </div>
  )
}
