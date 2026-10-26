import { Skeleton as Block, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { Link } from 'react-router-dom'
import { AiSuggestionBlock } from '../components/AiSuggestionCard'
import { PostponeButton } from '../components/PostponeMenu'
import { useQuickAdd } from '../components/QuickAdd'
import { useLineStatus, useTasks } from '../lib/api'
import { LINE_OA_ADD_FRIEND_URL } from '../lib/line'
import { clock, gutterLabel, longDate, remaining, timeStateOf } from '../lib/time'
import { useIsDesktop } from '../lib/useMedia'
import { Icon } from '../components/mobile/Icon'
import { TodayMobile } from '../components/mobile/TodayMobile'
import type { Task } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/dashboard — Figma v2 423:334 (desktop), 423:3003 / 447:2484 (phone),
 * 440:2244 with the AI block, 433:1329 postponing, 433:2302 the first visit.
 *
 * One card for the day, read top to bottom the way the day goes: what the AI
 * would do first, what is already late, what got done, a rule at NOW, and what
 * is still to come. The inbox and the reminder queue sit underneath.
 */
export default function Dashboard() {
  const { data, isPending, isError, refetch } = useTasks()
  const line = useLineStatus()
  const now = useNow()
  const desktop = useIsDesktop()

  if (isPending) return <Skeleton />
  if (isError) return <LoadFailed onRetry={() => void refetch()} />

  const open = data.filter((t) => t.status !== 'CANCELLED' && t.status !== 'DONE')
  const late = open
    .filter((t) => timeStateOf(t, now) === 'late')
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
  const todayKey = dayKey(now)
  const doneToday = data
    .filter((t) => t.status === 'DONE' && t.completedAt && dayKey(new Date(t.completedAt)) === todayKey)
    .sort((a, b) => moment(a).localeCompare(moment(b)))
  const upcoming = open
    .filter((t) => timeStateOf(t, now) === 'today')
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
  const waiting = open.filter((t) => t.status === 'WAITING').length
  const inbox = data
    .filter((t) => t.status === 'INBOX')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  // What the system is about to SEND, which is not the same list as what is due.
  const queued = open
    .filter((t) => t.dueAt && new Date(t.dueAt) >= now)
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))
    .slice(0, 3)

  const banner = line.data && line.data.friendState !== 'FRIEND' && data.length > 0 && (
    <div role="status" className="mx-4 mt-2 rounded-sheet border border-rule bg-sheet px-4 py-3 lg:mx-0 lg:mt-6 lg:px-5 lg:py-4">
      <p className="text-[14px] font-semibold text-ink">ยังยืนยันสถานะการแจ้งเตือน LINE ไม่ได้</p>
      <div className="mt-2 flex flex-wrap gap-x-5 text-[14px] font-medium lg:text-[13px]">
        <a href={LINE_OA_ADD_FRIEND_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-brand underline underline-offset-2 lg:min-h-9">เพิ่มเพื่อน LINE ↗</a>
        <Link to="/app/settings" className="flex min-h-11 items-center text-brand underline underline-offset-2 lg:min-h-9">ทดสอบการแจ้งเตือน</Link>
      </div>
    </div>
  )

  if (!desktop) {
    return (
      <TodayMobile
        open={open}
        late={late}
        doneToday={doneToday}
        upcoming={upcoming}
        now={now}
        banner={banner}
        empty={data.length === 0 ? <div className="px-4"><FirstVisit /><p className="font-display py-16 text-center text-[20px] font-medium text-ink-2">วันนี้ไม่มีอะไรค้าง</p></div> : undefined}
      />
    )
  }

  return (
    <>
      <p className="t-eyebrow text-ink-3">{longDate(now)}</p>
      <h1 className="t-page-title mt-1.5">วันนี้ต้องไม่หล่น</h1>

      {banner}

      {data.length === 0 ? (
        <FirstVisit />
      ) : (
        <>
          <section aria-labelledby="today-heading" className="mt-[33px] rounded-sheet border border-rule bg-sheet px-4 pt-4 pb-3 sm:px-[27px]">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 id="today-heading" className="font-display text-[17px] font-medium leading-[1.3]">งานวันนี้</h2>
              <p className="flex gap-5 text-[12px] text-ink-2">
                <span>รอคนอื่น <span className="font-mono font-semibold text-ink">{waiting}</span></span>
                <span>กล่องรับงาน <span className="font-mono font-semibold text-ink">{inbox.length}</span></span>
              </p>
            </header>

            <div className="mt-3">
              <AiSuggestionBlock tasks={data} />
            </div>

            {late.length > 0 && (
              <div className="border-b border-rule pt-4 pb-3">
                <p className="text-[13px] font-semibold text-time-late">เกินกำหนด {late.length} งาน</p>
                <ul className="mt-1.5">
                  {late.map((t, i) => (
                    <DayRow
                      key={t.id}
                      task={t}
                      lead={<span className="text-[12.5px] font-semibold text-time-late">{gutterLabel(t, now)}</span>}
                      meta={metaOf(t)}
                      action={<><span className="hidden sm:inline"><PostponeButton task={t} /></span><span className="sm:hidden"><PostponeButton task={t} short /></span></>}
                      last={i === late.length - 1}
                    />
                  ))}
                </ul>
              </div>
            )}

            {doneToday.length === 0 && upcoming.length === 0 && late.length === 0 ? (
              <div className="py-6">
                <p className="t-section">วันนี้ไม่มีอะไรค้าง</p>
              </div>
            ) : (
              <ul className="pt-2">
                {doneToday.map((t) => (
                  <DayRow
                    key={t.id}
                    task={t}
                    done
                    lead={<span className="font-mono text-[12.5px] text-ink-3">{clock(moment(t))}</span>}
                    meta={['เสร็จแล้ว', t.project?.name].filter(Boolean).join(' · ')}
                  />
                ))}
                <NowLine now={now} />
                {upcoming.length === 0 ? (
                  <li className="py-3 text-[13px] text-ink-3">ไม่มีงานครบกำหนดอีกในวันนี้</li>
                ) : (
                  upcoming.map((t, i) => (
                    <DayRow
                      key={t.id}
                      task={t}
                      strong={t.priority === 'HIGH' || t.priority === 'URGENT'}
                      lead={
                        <span className={`font-mono text-[12.5px] ${t.priority === 'HIGH' || t.priority === 'URGENT' ? 'font-semibold text-time-today-strong' : 'text-time-today'}`}>
                          {clock(t.dueAt!)}
                        </span>
                      }
                      meta={metaOf(t)}
                      action={i === 0 ? <span className="shrink-0 text-[12.5px] font-medium text-time-today">{remaining(t.dueAt!, now)}</span> : undefined}
                      last={i === upcoming.length - 1}
                    />
                  ))
                )}
              </ul>
            )}
          </section>

          <div className="mt-11 grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="inbox-heading" className="min-w-0">
              <header className="flex items-center justify-between">
                <h2 id="inbox-heading" className="t-section">กล่องรับงาน</h2>
                <p className="t-caption text-ink-3">ยังไม่ได้จัด {inbox.length}</p>
              </header>
              {inbox.length === 0 ? (
                <p className="mt-4 text-[13px] text-ink-3">กล่องรับงานว่างแล้ว</p>
              ) : (
                <div className="mt-3.5 py-1.5">
                  {inbox.slice(0, 4).map((t, i, list) => (
                    <InboxItem key={t.id} task={t} now={now} last={i === list.length - 1} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="queue-heading" className="min-w-0">
              <header className="flex items-center justify-between">
                <h2 id="queue-heading" className="t-section">การเตือนถัดไป</h2>
              </header>
              {queued.length === 0 ? (
                <p className="mt-4 text-[13px] text-ink-3">ไม่มีการเตือนรออยู่</p>
              ) : (
                <div className="mt-3.5 py-1.5">
                  {queued.map((t, i) => (
                    <div
                      key={t.id}
                      className={`flex items-baseline gap-3.5 py-3.5 ${i < queued.length - 1 ? 'border-b border-rule-soft' : ''}`}
                    >
                      <span className={`min-w-[84px] shrink-0 font-mono text-[12px] leading-[1.45] ${queueTone(t, now)}`}>
                        {gutterLabel(t, now)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] leading-[1.35]">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}

/**
 * One line of the day. A grid on a desktop — lead, title, meta, action — and a
 * stack on a phone, where the meta drops under the title instead of being cut.
 */
function DayRow({ task, lead, meta, action, done, strong, last }: {
  task: Task
  lead: React.ReactNode
  meta?: string
  action?: React.ReactNode
  done?: boolean
  strong?: boolean
  last?: boolean
}) {
  return (
    <li className={`flex items-center gap-3 py-2 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="w-[60px] shrink-0 sm:w-[96px]">{lead}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-6">
        <Link
          to={`/app/tasks/${task.id}`}
          className={`min-w-0 truncate text-[14px] hover:underline lg:w-[490px] lg:shrink-0 ${
            done ? 'text-ink-3 line-through' : strong ? 'font-semibold' : 'font-medium'
          }`}
        >
          {task.title}
        </Link>
        {meta && <span className="min-w-0 truncate text-[12px] text-ink-3">{meta}</span>}
      </span>
      {action}
    </li>
  )
}

/** The rule at NOW — a solid line and a chip with the time on it. */
function NowLine({ now }: { now: Date }) {
  return (
    <li aria-label={`ตอนนี้ ${clock(now.toISOString())}`} className="relative my-2 h-[19px]">
      <span className="absolute inset-x-0 top-1/2 h-px bg-ink" aria-hidden />
      <span className="absolute top-0 left-0 rounded-[2px] bg-ink py-0.5 pr-2 pl-[7px] text-[11px] font-semibold leading-[1.4] text-on-dark">
        ตอนนี้ {clock(now.toISOString())}
      </span>
    </li>
  )
}

function metaOf(t: Task): string {
  return [t.project?.name, t.requester ? `สั่งโดย ${t.requester}` : null].filter(Boolean).join(' · ')
}

/** When it was due today, else when it was finished. */
function moment(t: Task): string {
  return t.dueAt && dayKey(new Date(t.dueAt)) === dayKey(new Date()) ? t.dueAt : t.completedAt ?? t.createdAt
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
}

function queueTone(t: Task, now: Date): string {
  const s = timeStateOf(t, now)
  return s === 'today' ? 'text-time-today' : s === 'soon' ? 'text-time-soon' : 'text-ink-3'
}

/**
 * Inbox aging — Figma 433:1373. The bar fills toward the 24h default and turns
 * late past it, so the state reads without parsing the number.
 */
function InboxItem({ task, now, last }: { task: Task; now: Date; last: boolean }) {
  const hours = Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / 3_600_000)
  const over = hours > 24
  const fill = Math.min(hours / 24, 1) * 100

  return (
    <div className={`flex flex-col gap-2 py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <Link to={`/app/tasks/${task.id}`} className="text-[13.5px] leading-[1.35] hover:underline">{task.title}</Link>
      <div className={`flex items-center justify-between text-[10px] leading-[1.45] ${over ? 'text-time-late' : 'text-ink'}`}>
        <span>อยู่ในกล่อง {hours} ชม.</span>
        {over && <span>เกินเวลาจัด</span>}
      </div>
      <div className="h-0.5 w-full bg-rule-soft">
        <div className={`h-full ${over ? 'bg-time-late' : 'bg-time-done'}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  )
}

/** เริ่มใช้ WorkCatch — Figma 433:2302 and, on a phone, 475:2932: a checklist for an account with no work yet. */
function FirstVisit() {
  const quickAdd = useQuickAdd()
  return (
    <section aria-labelledby="start-heading" className="mt-[33px] rounded-sheet border border-rule bg-sheet px-4 pt-5 pb-2 max-lg:mt-4 sm:px-[27px]">
      <div className="flex items-baseline justify-between">
        <h2 id="start-heading" className="text-[15px] font-semibold max-lg:text-[17px]">เริ่มใช้ WorkCatch</h2>
        <span className="font-mono text-[13px] text-ink-3">1/4</span>
      </div>
      <ol className="mt-2">
        <Step done label="เข้าสู่ระบบด้วย LINE" />
        <Step label="เพิ่มเพื่อน LINE เพื่อรับการเตือน">
          <Link to="/app/connect-line" className="wc-lift inline-flex min-h-11 shrink-0 items-center rounded-control bg-line px-3.5 text-[14px] font-medium text-on-dark lg:min-h-9 lg:text-[13px]">
            เพิ่มเพื่อน
          </Link>
        </Step>
        <Step label="เพิ่มงานแรก">
          <button type="button" onClick={quickAdd.open} className="wc-lift inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-rule bg-sheet px-3.5 text-[14px] font-medium lg:min-h-9 lg:text-[13px]">
            + เพิ่มงาน
          </button>
        </Step>
        <Step label="ส่งงานจากแชท LINE" last>
          <a href={LINE_OA_ADD_FRIEND_URL} target="_blank" rel="noopener noreferrer" className="wc-lift inline-flex min-h-11 shrink-0 items-center rounded-control border border-rule bg-sheet px-3.5 text-[14px] font-medium lg:min-h-9 lg:text-[13px]">
            เปิดแชท
          </a>
        </Step>
      </ol>
    </section>
  )
}

function Step({ label, done, last, children }: { label: string; done?: boolean; last?: boolean; children?: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-3.5 py-3 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${done ? 'border-brand-strong bg-brand-strong text-on-dark' : 'border-rule'}`} aria-hidden>
        {done && <Icon name="check" size={14} />}
      </span>
      <span className={`min-w-0 flex-1 text-[15px] ${done ? 'text-ink-3 line-through' : ''}`}>{label}</span>
      {children}
    </li>
  )
}

/** Mirrors the real screen: header, the day card, then the two lists. */
function Skeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดงานวันนี้">
      <SkeletonPageHeader standfirst={false} />
      <Block w="100%" h="366px" className="mt-[33px] rounded-sheet" />
      <div className="mt-11 grid gap-10 lg:grid-cols-2">
        <Block w="100%" h="240px" className="rounded-sheet" />
        <Block w="100%" h="160px" className="rounded-sheet" />
      </div>
    </SkeletonScreen>
  )
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-sheet border border-error/35 bg-error/[0.07] px-6 py-5">
      <p className="text-[14px] font-semibold text-error">ต่อเซิร์ฟเวอร์ไม่ได้ เช็คอินเทอร์เน็ตแล้วลองใหม่</p>
      <button type="button" onClick={onRetry} className="wc-lift mt-3 min-h-9 rounded-control border border-rule bg-sheet px-3.5 text-[13px] font-medium">
        ลองใหม่
      </button>
    </div>
  )
}
