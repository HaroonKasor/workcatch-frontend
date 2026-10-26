import { useState } from 'react'
import { MobileBack } from '../components/mobile/MobileHeader'
import { ListGroup } from '../components/mobile/SwipeRow'
import { useNotifications } from '../lib/api'
import { notificationLabel as LABEL, notificationTone as TONE } from '../lib/style'
import { clock } from '../lib/time'
import type { NotificationRecord, NotificationStatus } from '../lib/types'
import { Skeleton as Block, SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../components/Skeleton'

/**
 * /app/notifications — Figma v2 423:2103; v1 47:810
 *
 * The wording here matters more than the layout. LINE returns 200 even when the
 * recipient has blocked the bot, so this screen says "ส่งแล้ว" meaning LINE
 * accepted the request, and says so explicitly in the subtitle. Claiming
 * delivery we cannot observe would be the most damaging lie this product could
 * tell, because the whole promise is that nothing slips.
 */
/** Header, the tally row, then the attempt log. */
function NotificationsSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดประวัติแจ้งเตือน">
      <SkeletonPageHeader />
      <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Block w="72px" h="10px" />
            <Block w="34px" h="18px" className="mt-1.5" />
          </div>
        ))}
      </div>
      <SkeletonRows rows={6} className="mt-6" />
    </SkeletonScreen>
  )
}

export default function Notifications() {
  const { data, isPending } = useNotifications()
  const [only, setOnly] = useState<'all' | 'failed' | 'retry'>('all')
  if (isPending) return <NotificationsSkeleton />

  const everything = [...(data ?? [])].sort((a, b) => b.at.localeCompare(a.at))
  // The phone's chips narrow the list; the desktop shows every row and its tallies.
  const items = only === 'failed' ? everything.filter((i) => i.status === 'FAILED_FINAL') : only === 'retry' ? everything.filter((i) => i.status === 'FAILED_RETRYABLE') : everything
  const count = (s: NotificationStatus[]) => everything.filter((i) => s.includes(i.status)).length

  return (
    <>
      <MobileBack to="/app/dashboard" label="เมนู" />
      <div className="max-lg:pb-4">
      <p className="t-caption text-ink-3 max-lg:hidden">30 วันล่าสุด</p>
      <h1 className="t-page-title mt-1 max-lg:px-4 max-lg:text-[32px]">การแจ้งเตือน</h1>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3 lg:hidden">
        {([['all', `ทั้งหมด ${everything.length}`], ['failed', `ล้มเหลว ${count(['FAILED_FINAL'])}`], ['retry', `กำลังลองใหม่ ${count(['FAILED_RETRYABLE'])}`]] as const).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={only === k} onClick={() => setOnly(k)} className={`min-h-11 shrink-0 rounded-pill px-4 text-[15px] ${only === k ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2'}`}>{label}</button>
        ))}
      </div>
      <dl className="mt-[33px] hidden flex-wrap gap-x-7 gap-y-3 lg:flex">
        <Tally label="ส่งแล้ว" value={count(['SENT'])} tone="text-ink" />
        <Tally label="รอส่ง" value={count(['PENDING', 'PROCESSING'])} tone="text-ink-3" />
        <Tally label="กำลังลองใหม่" value={count(['FAILED_RETRYABLE'])} tone="text-time-soon" />
        <Tally label="ล้มเหลว" value={count(['FAILED_FINAL'])} tone="text-error" />
        <Tally label="ยกเลิกเพราะปิดงาน" value={count(['CANCELLED'])} tone="text-ink-3" />
      </dl>

      {items.length === 0 ? (
        <div className="mt-6 rounded-sheet border border-rule bg-sheet px-7 py-11">
          <p className="t-section">ยังไม่มีการเตือนถูกส่ง</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-sheet border border-rule bg-sheet max-lg:hidden">
          {/* The column heads of v2 423:2103. Desktop only: on a phone each row
              wraps into its own card and the heads would label nothing. */}
          <div className="hidden items-center gap-x-4 border-b border-rule px-5 py-2.5 text-[12px] text-ink-3 sm:flex">
            <span className="w-32 shrink-0">เวลา</span>
            <span className="min-w-0 flex-1">งาน</span>
            <span className="w-16 shrink-0">ช่องทาง</span>
            <span className="w-28 shrink-0">สถานะ</span>
            <span className="w-72 shrink-0">เหตุผล</span>
          </div>
          {items.map((n, i) => <Row key={n.id} n={n} last={i === items.length - 1} />)}
        </div>
      )}
      {items.length > 0 && (
        <div className="lg:hidden">
          {groupByDay(items).map(([label, rows]) => (
            <ListGroup key={label} label={label} count={rows.length}>
              {rows.map((n) => <PhoneRow key={n.id} n={n} />)}
            </ListGroup>
          ))}
        </div>
      )}
      </div>
    </>
  )
}

/** Day headings for the phone list: วันนี้, เมื่อวาน, then the date. */
function groupByDay(items: NotificationRecord[]): [string, NotificationRecord[]][] {
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
  const now = new Date()
  const groups = new Map<string, NotificationRecord[]>()
  for (const n of items) {
    const d = new Date(n.at)
    const label = key(d) === key(now)
      ? 'วันนี้'
      : key(d) === key(new Date(now.getTime() - 86_400_000))
        ? 'เมื่อวาน'
        : new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' }).format(d)
    groups.set(label, [...(groups.get(label) ?? []), n])
  }
  return [...groups.entries()]
}

/** Figma 471:1920: the time, the task and its reason, and the verdict on the right. */
function PhoneRow({ n }: { n: NotificationRecord }) {
  return (
    <li className="flex gap-3 border-b border-rule-soft bg-sheet px-4 py-3">
      <span className="w-[52px] shrink-0 pt-[3px] font-mono text-[13px] text-ink-3">{clock(n.at)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-[1.35]">{n.taskTitle}</span>
        <span className="mt-0.5 block text-[13px] leading-[1.4] text-ink-3">
          {n.channel === 'IN_APP' ? 'ในแอป' : n.channel} · {n.reason}{n.errorCode ? ` · ${n.errorCode}` : ''}
        </span>
      </span>
      <span className={`shrink-0 pt-0.5 text-[13px] ${TONE[n.status]} ${n.status === 'SENT' ? '' : 'font-medium'}`}>
        {LABEL[n.status]}
        {n.status === 'FAILED_RETRYABLE' && ` ${n.attempt}/${n.maxAttempts}`}
      </span>
    </li>
  )
}

function Row({ n, last }: { n: NotificationRecord; last: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="t-caption w-32 shrink-0 text-ink-3">{when(n.at)}</span>
      <span className="min-w-0 flex-1 truncate text-[12.5px]">{n.taskTitle}</span>
      <span className="t-caption w-16 shrink-0 text-ink-3">{n.channel === 'IN_APP' ? 'ในแอป' : n.channel}</span>
      <span className={`w-28 shrink-0 text-[12px] ${TONE[n.status]} ${n.status === 'SENT' ? '' : 'font-medium'}`}>
        {n.status === 'FAILED_FINAL' && <span aria-hidden>✕ </span>}
        {LABEL[n.status]}
        {n.status === 'FAILED_RETRYABLE' && ` ${n.attempt}/${n.maxAttempts}`}
      </span>
      <span className="t-caption w-full shrink-0 text-ink-3 sm:w-72">
        {n.reason}{n.errorCode ? ` · ${n.errorCode}` : ''}
      </span>
    </div>
  )
}

function Tally({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dd className={`font-mono text-[19px] font-semibold ${tone}`}>{value}</dd>
      <dt className="t-meta text-ink-2">{label}</dt>
    </div>
  )
}

/** "วันนี้ 08:40", "เมื่อวาน 17:00", "6 ก.ย. 17:30" — v2 423:2103's own phrasing. */
function when(iso: string): string {
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
  const d = new Date(iso)
  const now = new Date()
  if (key(d) === key(now)) return `วันนี้ ${clock(iso)}`
  if (key(d) === key(new Date(now.getTime() - 86_400_000))) return `เมื่อวาน ${clock(iso)}`
  const date = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' }).format(d)
  return `${date} ${clock(iso)}`
}
