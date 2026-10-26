import { useState } from 'react'
import { SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useAdminAudit } from '../../lib/api'
/**
 * /admin/audit-logs — Figma node 54:979
 *
 * The interesting columns are the action and detail. The audit endpoint records
 * accounting facts, not a fabricated reason a server never stored.
 *
 * No current audit action opens a user's task data. The table keeps its privacy
 * restraint by showing only public targets and details supplied by the API.
 */

const MATCH: Record<string, (action: string) => boolean> = {
  'ทั้งหมด': () => true,
  'จัดการผู้ใช้': (action) => action === 'USER_SUSPENDED' || action === 'USER_RESTORED',
  'แก้ค่าระบบ': (action) => action === 'SETTING_CHANGED',
  'ส่งข้อความใหม่': (action) => action === 'NOTIFICATION_RETRIED',
}

const ACTION_LABELS: Record<string, string> = {
  USER_SUSPENDED: 'ระงับบัญชีผู้ใช้',
  USER_RESTORED: 'คืนสถานะบัญชีผู้ใช้',
  SETTING_CHANGED: 'เปลี่ยนการตั้งค่าระบบ',
  NOTIFICATION_RETRIED: 'ส่งการแจ้งเตือนใหม่',
}

export default function AdminAuditLogs() {
  const [active, setActive] = useState('ทั้งหมด')
  const audit = useAdminAudit()

  if (audit.isPending) return <AuditSkeleton />
  if (audit.isError || !audit.data) {
    return <p role="alert" className="t-body text-error">โหลดประวัติผู้ดูแลไม่สำเร็จ</p>
  }

  const rows = audit.data.filter((entry) => (MATCH[active] ?? (() => true))(entry.action))

  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">ประวัติผู้ดูแล</h1>
      <p className="t-body mt-2 text-ink-2">บันทึกทุกการกระทำสำคัญ ลบไม่ได้และแก้ไม่ได้</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.keys(MATCH).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActive(f)}
            aria-pressed={active === f}
            className={`rounded-pill px-3.5 py-1.5 text-[12px] ${
              active === f ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-sheet border border-rule bg-sheet">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th>
              <Th>ผู้ดูแล</Th>
              <Th>การกระทำและเป้าหมาย</Th>
              <Th>รายละเอียด</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.id} className={i < rows.length - 1 ? 'border-b border-rule-soft' : ''}>
                <td className="t-caption w-28 px-5 py-3.5 align-top text-ink-3">{stamp(e.at)}</td>
                <td className="w-28 px-5 py-3.5 align-top text-[12px] text-ink-2">
                  {e.actorName ?? 'ไม่ทราบชื่อผู้ดูแล'}
                </td>
                <td className="px-5 py-3.5 align-top">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-medium">{ACTION_LABELS[e.action] ?? e.action}</span>
                  </span>
                  <span className="t-caption mt-1 block text-ink-3">{e.target}</span>
                </td>
                <td className="max-w-[260px] px-5 py-3.5 align-top text-[12px] leading-relaxed text-ink-2">
                  {e.detail ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-5 py-6 text-[12.5px] text-ink-3">ไม่มีรายการในตัวกรองนี้</p>
        )}
      </div>

      <div className="mt-4 rounded-sheet border border-rule px-5 py-4">
        <p className="t-label text-ink-3">สิ่งที่บันทึกและไม่บันทึก</p>
        <p className="t-meta mt-1.5 leading-relaxed text-ink-2">
          บันทึก: ผู้ดำเนินการ เวลา การกระทำ เป้าหมาย และรายละเอียด ·
          ไม่บันทึก: access token, channel secret, รหัสผ่าน หรือเนื้อหางานของผู้ใช้
        </p>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}

function stamp(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function AuditSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดประวัติผู้ดูแล">
      <SkeletonPageHeader />
      <SkeletonRows rows={6} className="mt-6" />
    </SkeletonScreen>
  )
}
