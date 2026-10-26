import { useAiStatus, useAiSuggestion, useGenerateAiSuggestion } from '../../lib/api'
import { timeText } from '../../lib/style'
import { clock, gutterLabel, remaining, shortWeekdayDate, timeStateOf } from '../../lib/time'
import type { Task } from '../../lib/types'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { MobileHeader } from './MobileHeader'
import { ListGroup, TaskSwipeRow } from './SwipeRow'
import { useRowActions } from './useRowActions'

/**
 * วันนี้ on a phone — Figma 458:2.
 *
 * What the AI would do first sits at the top as one card with the two things you
 * do to a task (เลื่อน, ปิดงาน). It is then taken OUT of the lists below, so the
 * same task is never on the screen twice. Under it, what is late, what is done,
 * a rule at NOW, and what is still to come — rows you can swipe.
 */
export function TodayMobile({ open, late, doneToday, upcoming, now, banner, empty }: {
  /** Every open task; the AI's pick is found among these. */
  open: Task[]
  late: Task[]
  doneToday: Task[]
  upcoming: Task[]
  now: Date
  banner?: React.ReactNode
  /** Rendered instead of the day when the account has no work yet. */
  empty?: React.ReactNode
}) {
  const actions = useRowActions()
  const { pick, ask } = useAiPick(open)
  const lateRows = late.filter((t) => t.id !== pick?.id)
  const upcomingRows = upcoming.filter((t) => t.id !== pick?.id)
  const todayCount = doneToday.length + upcomingRows.length
  const firstUpcoming = upcomingRows[0]?.id

  return (
    <div className="lg:hidden">
      <MobileHeader title="วันนี้" sub={shortWeekdayDate(now)} />
      {banner}
      {empty ?? (
        <>
          {pick && <PickCard task={pick} now={now} actions={actions} />}
          {ask}

          {lateRows.length > 0 && (
            <ListGroup label="เกินกำหนด" count={lateRows.length} tone="late">
              {lateRows.map((t) => (
                <TaskSwipeRow key={t.id} task={t} now={now} actions={actions} />
              ))}
            </ListGroup>
          )}

          {todayCount > 0 || lateRows.length === 0 ? (
            <ListGroup label="กำหนดวันนี้" count={todayCount}>
              {doneToday.map((t) => (
                <TaskSwipeRow
                  key={t.id}
                  task={t}
                  now={now}
                  actions={actions}
                  done
                  swipe={false}
                  lead={clock(t.completedAt ?? t.dueAt ?? t.createdAt)}
                  leadClass="text-ink-3"
                />
              ))}
              <NowLine now={now} />
              {upcomingRows.length === 0 && (
                <li className="px-4 py-4 text-[14px] text-ink-3">ไม่มีงานครบกำหนดอีกในวันนี้</li>
              )}
              {upcomingRows.map((t) => (
                <TaskSwipeRow
                  key={t.id}
                  task={t}
                  now={now}
                  actions={actions}
                  lead={clock(t.dueAt!)}
                  leadClass={`${timeText[timeStateOf(t, now)]} ${t.priority === 'URGENT' || t.priority === 'HIGH' ? 'font-semibold' : ''}`}
                  meta={
                    t.id === firstUpcoming ? (
                      <>
                        <span className="text-time-today">{remaining(t.dueAt!, now)}</span>
                        {[t.project?.name, t.requester].filter(Boolean).map((x) => ` · ${x}`).join('')}
                      </>
                    ) : undefined
                  }
                />
              ))}
            </ListGroup>
          ) : null}
        </>
      )}
      {actions.sheet}
    </div>
  )
}

/**
 * The AI's first suggestion that is about a task still open. Before anything has
 * been asked today there is no pick, only a button: nothing goes to the model
 * until it is pressed.
 */
function useAiPick(open: Task[]): { pick: Task | null; ask: React.ReactNode } {
  const status = useAiStatus()
  const on = !!status.data?.available && !!status.data?.enabled
  const cached = useAiSuggestion(on)
  const generate = useGenerateAiSuggestion()
  const state = cached.data
  if (!on || !state) return { pick: null, ask: null }
  if (state.kind === 'ready') {
    for (const a of state.suggestion.actions) {
      const task = a.taskId ? open.find((t) => t.id === a.taskId) : undefined
      if (task) return { pick: task, ask: null }
    }
    return { pick: null, ask: null }
  }
  if (state.kind === 'empty') return { pick: null, ask: null }
  return {
    pick: null,
    ask: (
      <section aria-label="ควรทำก่อน" className="flex items-center justify-between gap-3 border-y border-rule bg-ground px-4 py-3">
        <p className="border-l-2 border-brand pl-2.5 text-[14px] font-medium text-brand-strong">ควรทำก่อน · จาก AI</p>
        <button
          type="button"
          disabled={generate.isPending}
          onClick={() => generate.mutate('request')}
          className="wc-lift min-h-11 rounded-control border border-rule bg-sheet px-4 text-[14px] font-medium disabled:opacity-55"
        >
          {generate.isPending ? 'กำลังคิด…' : 'ขอคำแนะนำวันนี้'}
        </button>
      </section>
    ),
  }
}

function PickCard({ task, now, actions }: { task: Task; now: Date; actions: ReturnType<typeof useRowActions> }) {
  const state = timeStateOf(task, now)
  const rest = [task.project?.name, task.requester].filter(Boolean).join(' · ')
  return (
    <section aria-label="ควรทำก่อน" className="border-y border-rule bg-ground px-4 pt-4 pb-4">
      <p className="border-l-2 border-brand pl-2.5 text-[14px] leading-[1.3] font-medium text-brand-strong">ควรทำก่อน · จาก AI</p>
      <Link to={`/app/tasks/${task.id}`} className="font-display mt-4 block text-[22px] leading-[1.3] font-medium">
        {task.title}
      </Link>
      <p className="mt-3 text-[14px] leading-[1.4] text-ink-3">
        <span className={`font-medium ${timeText[state]}`}>{gutterLabel(task, now)}</span>
        {rest && ` · ${rest}`}
      </p>
      <div className="mt-4 grid grid-cols-[1fr_1.35fr] gap-3">
        <button type="button" onClick={() => actions.postpone(task)} className="wc-lift flex min-h-12 items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium">
          <Icon name="clock" size={20} />เลื่อน
        </button>
        <button type="button" onClick={() => actions.close(task)} className="wc-lift flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand-strong text-[16px] font-medium text-on-dark">
          <Icon name="check" size={20} />ปิดงาน
        </button>
      </div>
    </section>
  )
}

/** The rule at NOW: a chip with the clock on it, and a line across the row. */
function NowLine({ now }: { now: Date }) {
  return (
    <li aria-label={`ตอนนี้ ${clock(now.toISOString())}`} className="relative flex h-8 items-center border-b border-rule-soft bg-sheet">
      <span className="absolute inset-x-0 top-1/2 h-px bg-ink" aria-hidden />
      <span className="relative ml-4 rounded-[3px] bg-ink px-2.5 py-1 text-[13px] leading-[1.2] font-semibold text-on-dark">
        ตอนนี้ {clock(now.toISOString())}
      </span>
    </li>
  )
}
