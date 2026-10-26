import { Link } from 'react-router-dom'
import { ApiError, useLineStatus, useTestLineMessage } from '../lib/api'
import { LINE_OA_ADD_FRIEND_URL, LINE_OA_ID } from '../lib/line'
import { Icon } from '../components/mobile/Icon'
import { MobileBack } from '../components/mobile/MobileHeader'
import { useToast } from '../components/Toast'

/**
 * /app/connect-line — Figma 475:3020 (add the account as a friend) and 475:3525
 * (connected). Reached from the first-visit checklist. One page for both states:
 * the answer to "are we friends yet" is the server's, and ตรวจอีกครั้ง asks again.
 */
export default function ConnectLine() {
  const line = useLineStatus()
  const test = useTestLineMessage()
  const toast = useToast()
  const status = line.data
  const linked = !!status?.linked
  const friend = status?.friendState === 'FRIEND'
  const done = linked && friend

  const sendTest = () =>
    test.mutate(undefined, {
      onSuccess: (r) =>
        r.status === 'SENT'
          ? toast({ title: 'ส่งข้อความทดสอบแล้ว', body: 'ตรวจในแชท LINE', tone: 'success' })
          : toast({ title: 'ส่งข้อความทดสอบไม่สำเร็จ', tone: 'error' }),
      onError: (e) => toast({ title: 'ส่งข้อความทดสอบไม่สำเร็จ', body: e instanceof ApiError ? e.message : undefined, tone: 'error' }),
    })

  return (
    <div className="mx-auto max-w-[480px] pb-[140px] lg:pb-10">
      <MobileBack to="/app/dashboard" label="วันนี้" />
      <div className="px-4 lg:px-0">
        {done ? (
          <>
            <span className="mt-8 flex size-14 items-center justify-center rounded-full bg-brand-strong text-on-dark"><Icon name="check" size={28} /></span>
            <h1 className="font-display mt-4 text-[28px] leading-[1.25] font-semibold">เชื่อม LINE แล้ว</h1>
          </>
        ) : (
          <h1 className="font-display mt-2 text-[28px] leading-[1.25] font-semibold">เพิ่ม WorkCatch เป็นเพื่อนใน LINE</h1>
        )}

        <dl className="mt-5 border-t border-rule">
          <Row k="บัญชีที่ใช้เข้าสู่ระบบ" v={linked ? 'เชื่อมอยู่' : 'ยังไม่ได้เชื่อม'} ok={linked} />
          <Row k={`เพื่อนกับ ${LINE_OA_ID}`} v={friend ? 'เป็นเพื่อนแล้ว' : 'ยังไม่ได้เพิ่ม'} ok={friend} />
          {done && <Row k="สรุปงานประจำวัน" v="09:00" />}
        </dl>

        {!done && (
          <figure className="mt-5 flex flex-col items-center">
            <img src="/images/line-qr.png" width={176} height={176} alt={`QR ของ ${LINE_OA_ID}`} className="rounded-control border border-rule bg-white p-3" />
            <figcaption className="mt-3 font-mono text-[16px] font-semibold">{LINE_OA_ID}</figcaption>
          </figure>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-sheet px-4 pt-3 lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:px-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        {done ? (
          <>
            <button type="button" disabled={test.isPending} onClick={sendTest} className="wc-lift flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium disabled:opacity-55">
              <Icon name="bell" size={20} />ส่งข้อความทดสอบ
            </button>
            <Link to="/app/dashboard" className="wc-lift mt-2.5 flex min-h-12 w-full items-center justify-center rounded-control bg-brand-strong text-[16px] font-medium text-on-dark">ไปที่วันนี้</Link>
          </>
        ) : (
          <>
            <a href={LINE_OA_ADD_FRIEND_URL} target="_blank" rel="noopener noreferrer" className="wc-lift flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-line text-[16px] font-medium text-on-dark">
              <Icon name="chat" size={20} />เปิด LINE เพื่อเพิ่มเพื่อน
            </a>
            <button type="button" onClick={() => void line.refetch()} disabled={line.isFetching} className="wc-lift mt-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium disabled:opacity-55">
              <Icon name="undo" size={20} />ตรวจอีกครั้ง
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-rule-soft">
      <dt className="text-[15px]">{k}</dt>
      <dd className={`flex items-center gap-1.5 text-[15px] ${ok ? 'font-medium text-brand-strong' : v === '09:00' ? 'font-mono font-medium' : 'text-ink-3'}`}>
        {v}
        {ok && <Icon name="check" size={16} />}
      </dd>
    </div>
  )
}
