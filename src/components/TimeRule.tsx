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

/**
 * Overdue ticks read as "3 วันก่อน", not "เกิน 3 วัน" as the row gutter does.
 * On a rule the eye is reading POSITION in time, so the label names when the
 * thing was; in a ledger row it is reading a debt, so the label names how far
 * past due it is. Same fact, two questions.
 */
function pastLabel(dueIso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(dueIso).getTime()) / 86_400_000)
  if (days <= 0) return 'วันนี้'
  return days === 1 ? 'เมื่อวาน' : `${days} วันก่อน`
}

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
      {/* Fixed coordinate space, transcribed from Figma node 10:5 (1128x214).
          The offsets are literal px on purpose: this project's spacing scale
          jumps 28 -> 40 at step 7, and reading the frame's 28px gutter as
          "spacing-7" shifted the whole rule 13px and shortened the track by 26.
          A measured drawing does not survive being re-derived from tokens. */}
      <div className="relative h-[178px]">
        <p className="t-label absolute left-[28px] top-[22px] text-ink-3">เส้นเวลาวันนี้</p>

        {counts.late > 0 && (
          <p className="t-note text-time-late absolute left-[32px] top-[60px]">
            เกินกำหนด {counts.late} งาน
          </p>
        )}

        {/* The track: everything below is placed as a percentage of it, so the
            rule stretches with the column without any offset arithmetic. */}
        <div className="absolute inset-y-0 left-[28px] right-[28px]">
          {/* The axis. Crimson behind you, neutral ahead of you. */}
          <div className="absolute inset-x-0 top-[132px] h-px bg-rule" />
          <div
            className="bg-time-late/45 absolute top-[132px] left-0 h-px"
            style={{ width: `${NOW_X}%` }}
          />

          {past.map(({ task, x }) => (
            <Tick key={task.id} x={x} task={task} now={now} label={task.dueAt ? pastLabel(task.dueAt, now) : undefined} />
          ))}
          {upcoming.map(({ task, x }) => (
            <Tick key={task.id} x={x} task={task} now={now} label={clock(task.dueAt!)} />
          ))}

          {/* Now. The only full-height mark on the rule. */}
          <div
            className="absolute w-0.5 bg-ink"
            style={{ left: `${NOW_X}%`, top: 80, height: 74 }}
            aria-hidden
          />
          <span
            className="t-now absolute -translate-x-1/2 text-ink"
            style={{ left: `${NOW_X}%`, top: 62 }}
          >
            ตอนนี้
          </span>
          <span
            className="t-now-clock absolute -translate-x-1/2 text-ink"
            style={{ left: `${NOW_X}%`, top: 158 }}
          >
            {clock(now.toISOString())}
          </span>
        </div>
      </div>

      <div className="mx-[28px] h-px bg-rule-soft" />
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 px-[28px] pt-[11px] pb-2">
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
        style={{ left: `${x}%`, top: 102, width: w, height: 31, transform: 'translateX(-50%)' }}
        title={task.title}
      />
      <div
        className={`absolute size-[5px] ${bg}`}
        style={{ left: `${x}%`, top: 97, transform: 'translateX(-50%)' }}
        aria-hidden
      />
      {/* Hidden on a phone: four clock labels inside 350px overlap into an
          unreadable smear. The ticks and the "now" mark still answer the question
          the rule exists to answer - what is behind me and what is ahead. */}
      {label && (
        <span
          className={`t-tick absolute hidden -translate-x-1/2 sm:block ${task.priority === 'URGENT' ? `font-semibold ${timeText[state]}` : 'text-ink-2'}`}
          style={{ left: `${x}%`, top: 140 }}
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
      <dt className="t-note text-ink-2">{label}</dt>
      <dd className={`font-mono text-[12px] leading-[1.45] font-semibold ${text}`}>{value}</dd>
    </div>
  )
}
