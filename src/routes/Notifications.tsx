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
  if (isPending) return <NotificationsSkeleton />

  const items = [...(data ?? [])].sort((a, b) => b.at.localeCompare(a.at))
  const count = (s: NotificationStatus[]) => items.filter((i) => s.includes(i.status)).length

  return (
    <>
      <p className="t-caption text-ink-3">30 วันล่าสุด</p>
      <h1 className="t-page-title mt-1">ประวัติแจ้งเตือน</h1>
      <dl className="mt-[33px] flex flex-wrap gap-x-7 gap-y-3">
        <Tally label="ส่งแล้ว" value={count(['SENT'])} tone="text-ink" />
        <Tally label="รอส่ง" value={count(['PENDING', 'PROCESSING'])} tone="text-ink-3" />
        <Tally label="กำลังลองใหม่" value={count(['FAILED_RETRYABLE'])} tone="text-time-soon" />
        <Tally label="ล้มเหลว" value={count(['FAILED_FINAL'])} tone="text-error" />
        <Tally label="ยกเลิกเพราะปิดงาน" value={count(['CANCELLED'])} tone="text-ink-3" />
      </dl>

      {items.length === 0 ? (
        <div className="mt-6 rounded-sheet border border-rule bg-sheet px-7 py-11">
          <p className="t-section">ยังไม่มีการเตือนถูกส่ง</p>
          <p className="t-body text-ink-2 mt-2 leading-relaxed">
            จะมีรายการที่นี่เมื่อถึงเวลาเตือนงานสักงาน ถ้าตั้งกำหนดส่งไว้แล้วแต่ยังไม่มีอะไรขึ้นเลย
            ให้ไปเช็คว่าเชื่อม LINE ครบหรือยัง
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-sheet border border-rule bg-sheet">
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

      <p className="t-meta text-ink-3 mt-4 leading-relaxed">
        งานที่ปิดแล้วจะยกเลิกการเตือนที่ยังไม่ส่งอัตโนมัติ · ความล้มเหลวชั่วคราวลองใหม่ที่ 1, 5 และ 30 นาที
        สูงสุด 3 ครั้ง · ความล้มเหลวถาวรจะไม่ลองใหม่ เพื่อไม่ให้เปลืองโควตา
      </p>
    </>
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
