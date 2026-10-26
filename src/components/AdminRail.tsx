import { Link, useLocation } from 'react-router-dom'
import { useAdminOverview } from '../lib/api'
import { BrandMark } from './BrandMark'

/**
 * Admin rail — Figma node 48:96.
 *
 * Same surface as the user rail. It used to be dark, on the reasoning that admin
 * mode can suspend accounts and re-send messages to real people, so the mode
 * should be unmissable. In practice the owner read the difference as two screens
 * that had not been finished to the same standard, not as a mode — so the signal
 * moved to the one place it cannot be mistaken for a style: a black badge that
 * says the mode in words, next to the wordmark.
 */
const ITEMS = [
  { to: '/admin', label: 'ภาพรวมระบบ' },
  { to: '/admin/users', label: 'ผู้ใช้' },
  { to: '/admin/notifications', label: 'การแจ้งเตือน', countLabel: 'ส่งไม่สำเร็จ 7 วัน' },
  // Outbound above, inbound below: การแจ้งเตือน is what the system sent, this is
  // what came in. Figma 48:96 puts them next to each other for that reason.
  { to: '/admin/line-events', label: 'งานเข้าจาก LINE', countLabel: 'ล้มเหลว 24 ชม.' },
  { to: '/admin/settings', label: 'ตั้งค่าระบบ' },
  { to: '/admin/audit-logs', label: 'ประวัติผู้ดูแล' },
]

export function AdminRail() {
  const { pathname } = useLocation()
  const overview = useAdminOverview()
  const counts = overview.isPending || overview.isError || !overview.data
    ? {}
    : {
        '/admin/users': overview.data.users.total,
        '/admin/notifications': overview.data.notifications7d.failed,
        '/admin/line-events': overview.data.inbound24h.failed,
      }

  return (
    <nav
      aria-label="เมนูผู้ดูแลระบบ"
      className="no-scrollbar sticky top-0 h-viewport w-rail shrink-0 overflow-y-auto overscroll-contain border-r border-rule bg-sheet px-5 pt-6 pb-7 text-ink"
    >
      <div className="flex items-center gap-2">
        <BrandMark className="text-ink" />
        <p className="t-wordmark">WorkCatch</p>
      </div>
      <span className="t-label mt-1.5 inline-block rounded-control bg-ink px-2 py-1 text-on-dark">
        ผู้ดูแลระบบ
      </span>

      <p className="t-label mt-7 px-3 pb-2 text-ink-3">ดูแลระบบ</p>
      {ITEMS.map((item) => {
        const active = pathname === item.to
        const count = counts[item.to as keyof typeof counts]
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            title={count !== undefined && count > 0 ? item.countLabel : undefined}
            className={`flex items-center justify-between rounded-control px-3 py-2 text-[13px] ${
              active ? 'bg-selected font-medium text-ink' : 'text-ink-2 hover:bg-ink/[0.03]'
            }`}
          >
            <span>{item.label}</span>
            {count !== undefined && count > 0 && <span className="font-mono text-[12px] text-ink-3">{count}</span>}
          </Link>
        )
      })}

      <Link
        to="/app/dashboard"
        className="wc-lift mt-6 block rounded-control border border-rule bg-sheet px-3 py-2.5 text-[12px] text-ink-2 hover:text-ink"
      >
        ‹  กลับหน้าผู้ใช้
      </Link>
    </nav>
  )
}
