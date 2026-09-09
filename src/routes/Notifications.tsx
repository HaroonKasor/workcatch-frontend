import { useNotifications } from '../lib/api'
import { clock, longDate } from '../lib/time'
import type { NotificationRecord, NotificationStatus } from '../lib/types'

/**
 * /app/notifications — Figma node 47:810
 *
 * The wording here matters more than the layout. LINE returns 200 even when the
 * recipient has blocked the bot, so this screen says "ส่งแล้ว" meaning LINE
 * accepted the request, and says so explicitly in the subtitle. Claiming
 * delivery we cannot observe would be the most damaging lie this product could
 * tell, because the whole promise is that nothing slips.
 */
const LABEL: Record<NotificationStatus, string> = {
  PENDING: 'รอส่ง',
  PROCESSING: 'กำลังส่ง',
  SENT: 'ส่งแล้ว',
  FAILED_RETRYABLE: 'กำลังลองใหม่',
  FAILED_FINAL: 'ล้มเหลว',
  CANCELLED: 'ยกเลิก',
}

const TONE: Record<NotificationStatus, string> = {
  PENDING: 'text-ink-3',
  PROCESSING: 'text-ink-3',
  SENT: 'text-ink-2',
  FAILED_RETRYABLE: 'text-time-soon',
  FAILED_FINAL: 'text-error',
  CANCELLED: 'text-ink-3',
}

export default function Notifications() {
  const { data, isPending } = useNotifications()
  if (isPending) return <p className="t-body text-ink-3">กำลังโหลด…</p>

  const items = [...(data ?? [])].sort((a, b) => b.at.localeCompare(a.at))
  const count = (s: NotificationStatus[]) => items.filter((i) => s.includes(i.status)).length

  return (
    <>
      <p className="t-caption text-ink-3">30 วันล่าสุด</p>
      <h1 className="t-page-title mt-1">ประวัติแจ้งเตือน</h1>
      <p className="t-body text-ink-2 mt-2">
        “ส่งแล้ว” หมายถึง LINE รับคำขอไปแล้ว ไม่ได้ยืนยันว่าคุณอ่าน
      </p>

      <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
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
      <span className="t-caption w-32 shrink-0 text-ink-3">
        {longDate(new Date(n.at)).split(' ').slice(1, 3).join(' ')} {clock(n.at)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px]">{n.taskTitle}</span>
      <span className="t-caption w-16 shrink-0 text-ink-3">{n.channel === 'IN_APP' ? 'ในแอป' : n.channel}</span>
      <span className={`w-28 shrink-0 text-[12px] ${TONE[n.status]} ${n.status === 'SENT' ? '' : 'font-medium'}`}>
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
