import { useState } from 'react'
import { SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useAdminAudit } from '../../lib/api'
import { LIST, PageTitle, Pills } from './ui'
/**
 * /admin/audit-logs — Figma 54:979 (desktop), 479:2864 (phone), 492:4526 (iPad)
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

const FILTERS = Object.keys(MATCH).map((key) => ({ key, label: key }))

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
      <PageTitle>ประวัติผู้ดูแล</PageTitle>

      <div className="min-[900px]:mt-4">
        <Pills items={FILTERS} value={active} onChange={setActive} />
      </div>

      {/* Under 900px: one entry per action. */}
      <ul className={`${LIST} min-[900px]:hidden`}>
        {rows.map((e, i) => (
          <li key={e.id} className={`px-4 py-3 ${i < rows.length - 1 ? 'border-b border-rule-soft' : ''}`}>
            <p className="text-[15px] font-medium">{ACTION_LABELS[e.action] ?? e.action}</p>
            <p className="mt-0.5 text-[13px] text-ink-3">{stamp(e.at)} · {e.actorName ?? 'ไม่ทราบชื่อผู้ดูแล'}</p>
            <p className="mt-0.5 font-mono text-[13px] text-ink-2">{e.target}</p>
            {e.detail && <p className="mt-0.5 text-[13px] text-ink-2">“{e.detail}”</p>}
          </li>
        ))}
      </ul>

      {/* From 900px: a table. */}
      <div className={`${LIST} hidden min-[900px]:block`}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th>
              <Th>การกระทำ</Th>
              <Th>เป้าหมาย</Th>
              <Th>รายละเอียด</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.id} className={i < rows.length - 1 ? 'border-b border-rule-soft' : ''}>
                <td className="w-36 px-4 py-3 align-top text-[13px] text-ink-3">{stamp(e.at)}</td>
                <td className="px-4 py-3 align-top">
                  <span className="block text-[13px] font-medium">{ACTION_LABELS[e.action] ?? e.action}</span>
                  <span className="block text-[13px] text-ink-3">{e.actorName ?? 'ไม่ทราบชื่อผู้ดูแล'}</span>
                </td>
                <td className="px-4 py-3 align-top font-mono text-[13px] text-ink-2">{e.target}</td>
                <td className="px-4 py-3 align-top text-[13px] text-ink-2">{e.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className={`${LIST} mt-4 px-4 py-5 text-[14px] text-ink-3`}>ไม่มีรายการในตัวกรองนี้</p>
      )}
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-4 py-2.5 font-medium text-ink-3">{children}</th>
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
      <SkeletonRows rows={6} className="mt-4" />
    </SkeletonScreen>
  )
}
