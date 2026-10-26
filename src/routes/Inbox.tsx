import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects, useTasks, useUpdateTask } from '../lib/api'
import { projectDot } from '../lib/style'
import { needsReview } from '../lib/tasks'
import type { ParseCandidate, Task } from '../lib/types'
import { useNow } from '../lib/useNow'
import { SourceMessage } from '../components/SourceMessage'
import { useIsDesktop } from '../lib/useMedia'
import { MobileListSkeleton } from '../components/mobile/States'
import { InboxMobile } from '../components/mobile/InboxMobile'
import { Skeleton as Block, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'

/**
 * /app/inbox — Figma v2 423:587 (one column; empty 433:1659); v1 34:2
 *
 * This screen has one job: turn raw captures into scheduled work. So every card
 * shows the two fields that are missing as dashed empty slots. The screen states
 * what is left to decide instead of just listing what came in.
 *
 * The cards that come first are the ones the LINE parser was NOT sure about —
 * Figma 217:1572. Those are drafted with no deadline and no reminder on purpose:
 * a reminder set from a guess at "วันศุกร์บ่ายสอง" is worse than no reminder,
 * because it teaches people the reminders are wrong. The card quotes the message
 * it read and offers the readings it considered, so the decision is the reader's
 * and is one tap.
 */
/** The triage list — one column, as on v2 423:587. */
function InboxSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดกล่องรับงาน">
      <SkeletonPageHeader standfirst={false} />
      <div className="mt-[33px] space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} w="100%" h="96px" className="rounded-sheet" />
        ))}
      </div>
    </SkeletonScreen>
  )
}

export default function Inbox() {
  const { data, isPending } = useTasks()
  const now = useNow()
  const desktop = useIsDesktop()

  if (isPending) return desktop ? <InboxSkeleton /> : <MobileListSkeleton title="กล่องรับงาน" label="กำลังโหลดกล่องรับงาน" />

  const inbox = (data ?? []).filter((t) => t.status === 'INBOX')
  // Uncertain drafts sort to the top ahead of the plain triage cards: they are
  // the only ones in the list where nothing is scheduled AND the system already
  // has an opinion waiting to be confirmed.
  const items = [...inbox].sort((a, b) => {
    const byReview = Number(needsReview(b)) - Number(needsReview(a))
    return byReview !== 0 ? byReview : a.createdAt.localeCompare(b.createdAt)
  })
  const review = inbox.filter(needsReview).length
  if (!desktop) return <InboxMobile items={items} now={now} />

  return (
    <>
      <p className="t-caption text-ink-3">กล่องรับงาน</p>
      <h1 className="t-page-title mt-1">
        {items.length === 0 ? 'กล่องรับงานว่างแล้ว' : `จัด ${items.length} งานเข้าที่`}
      </h1>
      {/* v2 423:587 carries no standfirst; the review count is still said,
          to screen readers, because the cards alone only show it. */}
      {review > 0 && <p className="sr-only">{review} งานจาก LINE ที่ระบบอ่านเวลาไม่ชัด รอให้ยืนยัน</p>}

      <div className="mt-[33px]">
        <div className="min-w-0 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-sheet border border-rule bg-sheet px-7 py-11">
              <p className="t-section">ทุกงานมีที่อยู่แล้ว</p>
            </div>
          ) : (
            items.map((t) =>
              needsReview(t)
                ? <ReviewCard key={t.id} task={t} now={now} />
                : <TriageCard key={t.id} task={t} now={now} />,
            )
          )}
        </div>
      </div>
    </>
  )
}

/**
 * A LINE draft the parser could not place — Figma 217:1572.
 *
 * Rendered entirely from the task: the badge, the quoted message and the
 * candidate readings all come from what the server sent. Nothing here re-reads
 * the Thai date phrasing in the browser, because a second parser in the client
 * would eventually disagree with the one that drafted the task and there would
 * be no way to tell which was right.
 *
 * The border is time/today rather than state/error: the task is not wrong, its
 * TIME is unresolved, which is exactly what a warm hue means everywhere else in
 * this product.
 */
function ReviewCard({ task, now }: { task: Task; now: Date }) {
  const update = useUpdateTask()
  const [editing, setEditing] = useState(false)
  // The readings are resolved against the moment the message arrived, so one
  // can already be over by the time somebody opens the inbox. Choosing it
  // would file the task as late on the spot; it is left out, and "แก้เอง"
  // remains for a time the parser did not offer.
  const candidates = (task.parseCandidates ?? []).filter((c) => Date.parse(c.dueAt) > now.getTime())

  // ONE write: PUT /due. The server clears the parse doubt on any edit and moves
  // an inbox task that gains a deadline to TODO in the same transaction. Sending
  // the status as a separate PATCH first could leave a TODO task with no
  // deadline and its question gone, if the second request failed.
  const setDue = (dueAt: string) => update.mutate({ id: task.id, patch: { dueAt } })
  const choose = (c: ParseCandidate) => setDue(c.dueAt)

  return (
    <article className="rounded-sheet border border-time-today bg-sheet px-5 pb-4 pt-4.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* The tint pair, not the flat hue: time/today on its own 12% wash
            fails 4.5:1, and time/today-strong on it clears. */}
        <span className="t-label rounded-[3px] bg-time-today/[0.12] px-2 py-1 text-time-today-strong">
          ต้องตรวจสอบ
        </span>
        <span className="t-caption ml-auto text-ink-3">จาก {task.source ?? 'LINE'}</span>
      </div>

      <h3 className="mt-1 text-[15px] font-medium leading-snug">
        <CardTitle task={task} />
      </h3>

      {/* The parser's own sentence when it sent one, because only it knows which
          fragment it choked on. The fallback still says the two things that
          matter: nothing is scheduled, and nothing will be sent. */}
      {task.parseNote && <p className="t-body text-ink-2 mt-2.5 leading-relaxed">{task.parseNote}</p>}

      {task.sourceMessage && <SourceMessage task={task} />}

      {candidates.length > 0 && <p className="t-label mt-3.5 text-ink-3">เลือกเวลา</p>}
      <div className={`${candidates.length > 0 ? 'mt-2' : 'mt-3.5'} flex flex-wrap gap-2`}>
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={update.isPending}
            onClick={() => choose(c)}
            className="wc-lift min-h-11 rounded-control border border-rule bg-ground px-3 text-[12px] font-medium disabled:opacity-55"
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="wc-lift min-h-11 rounded-control border border-rule bg-ground px-3 text-[12px] font-medium"
        >
          แก้เอง
        </button>
      </div>

      {editing && (
        <input
          type="datetime-local"
          autoFocus
          aria-label={`กำหนดส่งของ ${task.title}`}
          onChange={(e) => {
            if (!e.target.value) return
            setDue(new Date(e.target.value).toISOString())
            setEditing(false)
          }}
          className="mt-3 h-11 w-full rounded-control border border-rule bg-ground px-2.5 font-mono text-[12px]"
        />
      )}
    </article>
  )
}

function TriageCard({ task, now }: { task: Task; now: Date }) {
  const hours = Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / 3_600_000)
  const over = hours > 24
  const update = useUpdateTask()
  const projects = useProjects()
  const [open, setOpen] = useState<'due' | 'project' | 'waiting' | null>(null)
  const [waitingFor, setWaitingFor] = useState('')

  const patch = (p: Parameters<typeof update.mutate>[0]['patch']) => {
    update.mutate({ id: task.id, patch: p })
    setOpen(null)
  }

  return (
    <article className="rounded-sheet border border-rule bg-sheet px-5 pb-4 pt-4.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h3 className="min-w-0 text-[15px] font-medium leading-snug">
          <CardTitle task={task} />
        </h3>
        {task.source && <span className="t-caption shrink-0 text-ink-3">จาก {task.source}</span>}
      </div>

      {/* Dashed means "not filled in yet" — the same language as Quick Add.
          A deadline or a project is what moves a task out of the inbox (the
          server applies the same rule), so both of those actions also change
          its status; waiting on somebody moves it to WAITING. */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Slot onClick={() => setOpen(open === 'due' ? null : 'due')} filled={!!task.dueAt}>
          กำหนดส่ง
        </Slot>
        <Slot onClick={() => setOpen(open === 'project' ? null : 'project')} filled={!!task.project}>
          {task.project ? task.project.name : 'โปรเจกต์'}
        </Slot>
        <Slot onClick={() => setOpen(open === 'waiting' ? null : 'waiting')} filled={!!task.waitingFor}>
          {task.waitingFor ? `รอ ${task.waitingFor}` : 'รอคนอื่น'}
        </Slot>
      </div>

      {open === 'due' && (
        <input
          type="datetime-local"
          autoFocus
          aria-label={`กำหนดส่งของ ${task.title}`}
          onChange={(e) => {
            if (!e.target.value) return
            // One write; the server moves an inbox task with a deadline to TODO.
            patch({ dueAt: new Date(e.target.value).toISOString() })
          }}
          className="mt-3 h-9 w-full rounded-control border border-rule bg-ground px-2.5 font-mono text-[12px]"
        />
      )}

      {open === 'project' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Archived projects take no new work (Figma 46:729); Quick Add and the
              rail leave them out for the same reason. */}
          {(projects.data ?? []).filter((p) => !p.archivedAt).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => patch({ projectId: p.id })}
              className="flex items-center gap-2 rounded-control border border-rule px-3 py-1.5 text-[12px]"
            >
              <span className={`size-1.5 rounded-full ${projectDot[p.color]}`} aria-hidden />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {open === 'waiting' && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!waitingFor.trim()) return
            patch({ waitingFor: waitingFor.trim(), status: 'WAITING' })
          }}
        >
          <input
            autoFocus
            value={waitingFor}
            onChange={(e) => setWaitingFor(e.target.value)}
            placeholder="รอใคร เช่น คุณอนงค์"
            aria-label={`คนที่รอสำหรับ ${task.title}`}
            className="h-9 min-w-0 flex-1 rounded-control border border-rule bg-ground px-2.5 text-[12.5px] placeholder:text-ink-3"
          />
          <button type="submit" className="h-9 shrink-0 rounded-control bg-brand px-3.5 text-[12px] font-medium text-on-dark">
            บันทึก
          </button>
        </form>
      )}

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

/**
 * The way out of the card, and the only way to the task itself.
 *
 * It used to be a bare heading, which made the detail screen reachable only by
 * giving the task a deadline — the one action that also promotes it OUT of this
 * list. So the way to read a capture was to schedule it first, which is backwards:
 * the reason to open it is usually to find out what it is before deciding.
 *
 * A link rather than a clickable card. The card already holds buttons, and a
 * button inside a link is invalid and unpredictable for anyone driving this from
 * the keyboard; the surrounding controls keep working because they were never
 * inside the link to begin with. min-h-11 keeps the target thumb-sized at 390px.
 */
function CardTitle({ task }: { task: Task }) {
  return (
    <Link
      to={`/app/tasks/${task.id}`}
      className="flex min-h-11 items-center rounded-control hover:underline"
    >
      {task.title}
    </Link>
  )
}

function Slot({
  children,
  onClick,
  filled,
}: {
  children: React.ReactNode
  onClick: () => void
  filled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-[12px] ${
        filled
          ? 'border-rule text-ink-2'
          : 'border-dashed border-ink-3 text-ink-3 hover:border-ink-2 hover:text-ink-2'
      }`}
    >
      {!filled && <span className="font-mono">+</span>}
      {children}
    </button>
  )
}
