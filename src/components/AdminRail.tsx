import { Link, useLocation } from 'react-router-dom'

/**
 * Admin rail — Figma node 48:96.
 *
 * Deliberately dark. Admin mode can suspend accounts and re-send messages to
 * real people, and the surest way to do that by accident is to not notice which
 * mode you are in. The surface change is the signal.
 */
const ITEMS = [
  { to: '/admin', label: 'ภาพรวมระบบ' },
  { to: '/admin/users', label: 'ผู้ใช้', count: '24' },
  { to: '/admin/notifications', label: 'การแจ้งเตือน', count: '3' },
  { to: '/admin/settings', label: 'ตั้งค่าระบบ' },
  { to: '/admin/audit-logs', label: 'ประวัติผู้ดูแล' },
]

export function AdminRail() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="เมนูผู้ดูแลระบบ"
      className="sticky top-0 h-dvh w-rail shrink-0 overflow-y-auto bg-ink px-5 pt-6 pb-7 text-on-dark"
    >
      <p className="t-wordmark">WorkCatch</p>
      <span className="t-label mt-1.5 inline-block rounded-[4px] bg-on-dark/15 px-1.5 py-1">
        ผู้ดูแลระบบ
      </span>

      <p className="t-label mt-7 px-3 pb-2 opacity-40">ดูแลระบบ</p>
      {ITEMS.map((item) => {
        const active = pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-between rounded-control px-3 py-2 text-[13px] ${
              active ? 'bg-on-dark/[0.12] font-medium' : 'opacity-65 hover:opacity-100'
            }`}
          >
            <span>{item.label}</span>
            {item.count && <span className="font-mono text-[10.5px] opacity-60">{item.count}</span>}
          </Link>
        )
      })}

      <Link
        to="/app/dashboard"
        className="mt-6 block rounded-control border border-on-dark/20 px-3 py-2.5 text-[12px] opacity-75 hover:opacity-100"
      >
        ‹  กลับหน้าผู้ใช้
      </Link>
    </nav>
  )
}
