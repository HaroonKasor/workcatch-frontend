import { Link } from 'react-router-dom'
import { useAiPreferences, useAiStatus, useUpdateAiPreferences, type LinePreferences, type LineStatus, type Me } from '../../lib/api'
import { LINE_OA_ID } from '../../lib/line'
import { priorityLabel } from '../../lib/style'
import { useToast } from '../Toast'
import { Icon } from './Icon'
import { MobileBack } from './MobileHeader'
import { ListGroup } from './SwipeRow'

/**
 * ตั้งค่า on a phone — Figma 471:2003 and 471:2093: a menu list. A row is a
 * label and, on the right, what it is now; a › means it goes somewhere, a switch
 * means it changes in place. A value the server cannot yet change is shown as
 * plain text with neither, so no row promises an edit it cannot make.
 */

const FREE_LINE_MESSAGES = 300

export function SettingsMobile({ me, line, onPreference, onTest, testing, onLogout, loggingOut, onDelete }: {
  me?: Me
  line: LineStatus
  onPreference: (key: keyof LinePreferences) => void
  onTest: () => void
  testing: boolean
  onLogout: () => void
  loggingOut: boolean
  onDelete: () => void
}) {
  const toast = useToast()
  const status = useAiStatus()
  const prefs = useAiPreferences()
  const updateAi = useUpdateAiPreferences()
  const p = prefs.data ?? { enabled: true, useHabits: true }
  const setAi = (next: typeof p) =>
    updateAi.mutate(next, { onError: () => toast({ title: 'บันทึกการตั้งค่า AI ไม่สำเร็จ', tone: 'error' }) })
  const { preferences } = line
  const used = line.usage.sentLast30Days
  const friend = line.friendState === 'FRIEND'

  return (
    <div className="pb-4 lg:hidden">
      <MobileBack to="/app/dashboard" label="เมนู" />
      <h1 className="font-display px-4 pt-1 pb-3 text-[32px] leading-[1.2] font-semibold tracking-[-0.5px]">ตั้งค่า</h1>

      <ListGroup label="บัญชี" count={0} hideCount>
        <Row label={me?.displayName || 'บัญชีของคุณ'} strong value="ผ่าน LINE" />
        <Row label="เขตเวลา" value={me?.timezone ?? 'Asia/Bangkok'} />
        <Row label="ภาษา" value="ไทย" />
        {me?.admin && <Row label="โหมดผู้ดูแลระบบ" to="/admin" />}
      </ListGroup>

      <ListGroup label="LINE" count={0} hideCount>
        <Row label="บัญชีที่ใช้เข้าสู่ระบบ" ok={line.linked} value={line.linked ? 'เชื่อมอยู่' : 'ยังไม่ได้เชื่อม'} />
        <Row label={`เพื่อนกับ ${LINE_OA_ID}`} ok={friend} value={friend ? 'เป็นเพื่อนแล้ว' : 'ยังไม่ได้เพิ่ม'} to={friend ? undefined : '/app/connect-line'} />
        <Switch label="รับการเตือนทาง LINE" on={preferences.lineNotify} onChange={() => onPreference('lineNotify')} />
        <Row label="ทดสอบการเตือน" action={testing ? 'กำลังส่ง…' : 'ส่ง'} onAction={line.linked && line.testMessages.leftToday > 0 ? onTest : undefined} />
      </ListGroup>

      <ListGroup label="การเตือน" count={0} hideCount>
        <Switch label="เตือนแยกทีละงาน" on={preferences.eachTask} onChange={() => onPreference('eachTask')} />
        <Switch label="สรุปประจำวัน" on={preferences.digest} onChange={() => onPreference('digest')} />
        <Row label="เตือนก่อนครบกำหนด" value="1 วัน, 2 ชม." />
        <Switch label="รอคนอื่นเมื่อถึงวันติดตาม" on={preferences.waitingFollowUp} onChange={() => onPreference('waitingFollowUp')} />
      </ListGroup>

      <ListGroup label="ผู้ช่วย AI" count={0} hideCount>
        <Switch label="เปิดผู้ช่วย AI" on={p.enabled} onChange={() => setAi({ ...p, enabled: !p.enabled })} />
        <Switch label="จำวิธีทำงานของฉัน" on={p.useHabits} disabled={!p.enabled} onChange={() => setAi({ ...p, useHabits: !p.useHabits })} />
        <li className="border-b border-rule-soft bg-sheet px-4 py-3">
          <p className="text-[14px] font-medium">ข้อมูลที่ส่งให้ AI</p>
          <dl className="mt-1.5 space-y-1.5 text-[14px]">
            {[
              ['ชื่องาน กำหนดส่ง สถานะ และชื่อโปรเจกต์', 'ส่งเมื่อเปิด AI'],
              ['เนื้อหาบันทึก', 'ไม่ส่งเลย'],
              ['ข้อมูลลับในบันทึก', 'ไม่ส่งเลย'],
              ['ข้อความต้นฉบับจาก LINE', 'ไม่ส่งเลย'],
            ].map(([what, when]) => (
              <div key={what} className="flex justify-between gap-3">
                <dt className="min-w-0 text-ink-2">{what}</dt>
                <dd className="shrink-0 text-ink-3">{when}</dd>
              </div>
            ))}
          </dl>
        </li>
        <Row label="ใช้ไปวันนี้" value={status.data ? `${status.data.usedToday} / ${status.data.dailyLimit}` : '—'} />
      </ListGroup>

      <ListGroup label="ข้อความ LINE เดือนนี้" count={0} hideCount>
        <li className="border-b border-rule-soft bg-sheet px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[16px] font-medium">{used} จาก {FREE_LINE_MESSAGES}</span>
            <span className="text-[14px] text-ink-3">แผนฟรี</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-pill bg-rule-soft" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={FREE_LINE_MESSAGES} aria-label="ข้อความ LINE เดือนนี้">
            <div className="h-full rounded-pill bg-brand" style={{ width: `${Math.min(used / FREE_LINE_MESSAGES, 1) * 100}%` }} />
          </div>
        </li>
        <Row label="แผนการใช้งาน" value="ฟรี" to="/app/upgrade" />
      </ListGroup>

      <ListGroup label="ค่าเริ่มต้นของงาน" count={0} hideCount>
        <Row label="ความสำคัญเริ่มต้น" value={priorityLabel.MEDIUM} />
        <Row label="เก็บงานที่ลบไว้" value="30 วัน" />
      </ListGroup>

      <ListGroup label="ออกจากบัญชี" count={0} hideCount>
        <Row label={loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'} onAction={onLogout} />
        <Row label="ลบบัญชีและข้อมูลทั้งหมด" danger onAction={onDelete} />
      </ListGroup>
    </div>
  )
}

function Row({ label, value, to, ok, strong, danger, action, onAction }: {
  label: string
  value?: string
  to?: string
  ok?: boolean
  strong?: boolean
  danger?: boolean
  /** A word at the right that does something when pressed. */
  action?: string
  onAction?: () => void
}) {
  const body = (
    <>
      <span className={`min-w-0 flex-1 text-[16px] ${strong ? 'font-medium' : ''} ${danger ? 'text-time-late' : ''}`}>{label}</span>
      {value && <span className={`shrink-0 text-[15px] ${ok ? 'font-medium text-brand-strong' : 'text-ink-3'}`}>{value}</span>}
      {ok && <Icon name="check" size={16} className="text-brand-strong" />}
      {action && <span className="shrink-0 text-[15px] font-medium text-brand-strong">{action}</span>}
      {to && <Icon name="chevronRight" size={18} className="text-ink-3" />}
    </>
  )
  const cls = 'flex min-h-[52px] w-full items-center gap-2.5 border-b border-rule-soft bg-sheet px-4 text-left'
  return (
    <li>
      {to ? (
        <Link to={to} className={cls}>{body}</Link>
      ) : onAction ? (
        <button type="button" onClick={onAction} className={cls}>{body}</button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

function Switch({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <li className="flex min-h-[52px] items-center gap-3 border-b border-rule-soft bg-sheet px-4">
      <span className={`min-w-0 flex-1 text-[16px] ${disabled ? 'text-ink-3' : ''}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className="relative h-11 w-[58px] shrink-0 disabled:opacity-45"
      >
        <span aria-hidden className={`absolute top-1/2 left-0 h-[31px] w-[51px] -translate-y-1/2 rounded-pill transition-colors ${on ? 'bg-brand-strong' : 'bg-rule'}`}>
          <span className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-[2px]'}`} />
        </span>
      </button>
    </li>
  )
}
