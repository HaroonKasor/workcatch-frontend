import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAdminOverview } from '../lib/api'
import { BrandMark } from './BrandMark'

/**
 * Admin navigation, in the three shapes the admin area takes.
 *
 * - AdminRail (1280 and up): the light rail, Figma 48:96. It used to be dark, on
 *   the reasoning that admin mode can suspend accounts and re-send messages to
 *   real people, so the mode should be unmissable. The owner read that as two
 *   screens finished to different standards, so the signal moved to a black
 *   badge that says the mode in words.
 * - AdminRailCompact (900 to 1279): the dark iPad rail, Figma 492:4128.
 * - AdminPageSwitcher (under 900): the page title that opens a sheet of pages,
 *   under the dark bar — Figma 479:2408, 479:2490.
 *
 * Outbound above, inbound below: การแจ้งเตือน is what the system sent, งานเข้าจาก
 * LINE is what came in.
 */
const ITEMS = [
  { to: '/admin', label: 'ภาพรวมระบบ' },
  { to: '/admin/users', label: 'ผู้ใช้' },
  { to: '/admin/line-events', label: 'งานเข้าจาก LINE' },
  { to: '/admin/notifications', label: 'การแจ้งเตือน' },
  { to: '/admin/audit-logs', label: 'ประวัติผู้ดูแล' },
  { to: '/admin/settings', label: 'ตั้งค่าระบบ' },
]

function adminTitle(pathname: string): string {
  return ITEMS.find((i) => i.to === pathname)?.label ?? 'ผู้ดูแลระบบ'
}

/** What is waiting on each page; a page with nothing waiting shows nothing. */
function useCounts(): Record<string, { n: number; text: string; warn?: boolean }> {
  const overview = useAdminOverview()
  if (overview.isPending || overview.isError || !overview.data) return {}
  const { users, notifications7d, inbound24h } = overview.data
  const counts: Record<string, { n: number; text: string; warn?: boolean }> = {}
  if (users.total > 0) counts['/admin/users'] = { n: users.total, text: String(users.total) }
  if (inbound24h.failed > 0) counts['/admin/line-events'] = { n: inbound24h.failed, text: `${inbound24h.failed} ต้องตรวจ` }
  if (notifications7d.failed > 0) {
    counts['/admin/notifications'] = { n: notifications7d.failed, text: `${notifications7d.failed} ล้มเหลว`, warn: true }
  }
  return counts
}

function ExitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 5l3 3-3 3M13 8H6" />
    </svg>
  )
}

/** Under 900: the dark bar that says which mode this is, and the way back. */
export function AdminTopBar() {
  return (
    <div className="flex min-h-12 items-center justify-between bg-ink px-4 text-on-dark min-[900px]:hidden">
      <span className="text-[13px] opacity-80">โหมดผู้ดูแลระบบ</span>
      <Link to="/app/dashboard" className="flex min-h-11 items-center gap-2 text-[14px]">
        <ExitIcon />
        กลับแอป
      </Link>
    </div>
  )
}

export function AdminPageSwitcher() {
  const { pathname } = useLocation()
  const counts = useCounts()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-[900px]:hidden">
      <h1 className="px-4 pt-2 pb-2">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-2 font-display text-[26px] leading-[1.3] font-semibold tracking-[-0.4px]"
        >
          {adminTitle(pathname)}
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h1>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="เลือกหน้า">
          <button type="button" aria-label="ปิด" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/50" />
          <div className="relative mx-auto w-full max-w-[560px] rounded-t-[20px] bg-sheet px-4 pt-3 pb-6">
            <span aria-hidden className="mx-auto mb-2 block h-1 w-9 rounded-pill bg-rule" />
            <nav aria-label="หน้าผู้ดูแลระบบ">
              {ITEMS.map((item) => {
                const active = pathname === item.to
                const count = counts[item.to]
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className="flex min-h-[52px] items-center justify-between gap-3 border-b border-rule-soft text-[15px] last:border-b-0"
                  >
                    <span className={active ? 'font-medium' : ''}>{item.label}</span>
                    {active ? (
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-brand-strong">
                        <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      count && (
                        <span className={`text-[14px] ${count.warn ? 'text-time-soon-strong' : 'text-ink-3'}`}>{count.text}</span>
                      )
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}

/** 900 to 1279: the dark rail. */
export function AdminRailCompact() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="เมนูผู้ดูแลระบบ"
      className="sticky top-0 flex h-viewport w-[174px] shrink-0 flex-col bg-ink px-3 pt-5 pb-5 text-on-dark"
    >
      <p className="px-2 text-[13px] opacity-70">โหมดผู้ดูแลระบบ</p>
      <div className="mt-2 flex items-center gap-2 px-2">
        <BrandMark size={22} className="text-on-dark" />
        <p className="font-display text-[17px] font-semibold">WorkCatch</p>
      </div>
      <div className="mt-5">
        {ITEMS.map((item) => {
          const active = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-control px-2.5 text-[13px] ${
                active ? 'bg-on-dark/10 font-medium' : 'opacity-80 hover:bg-on-dark/5 hover:opacity-100'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <Link to="/app/dashboard" className="mt-auto flex min-h-11 items-center gap-2 rounded-control px-2.5 text-[13px] hover:bg-on-dark/5">
        <ExitIcon />
        กลับแอป
      </Link>
    </nav>
  )
}

/** 1280 and up: the light rail. */
export function AdminRail() {
  const { pathname } = useLocation()
  const counts = useCounts()

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
        const count = counts[item.to]
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-between rounded-control px-3 text-[13px] ${
              active ? 'bg-selected font-medium text-ink' : 'text-ink-2 hover:bg-ink/[0.03]'
            }`}
          >
            <span>{item.label}</span>
            {count && <span className="font-mono text-[12px] text-ink-3">{count.n}</span>}
          </Link>
        )
      })}

      <Link
        to="/app/dashboard"
        className="wc-lift mt-6 flex min-h-11 items-center rounded-control border border-rule bg-sheet px-3 text-[13px] text-ink-2 hover:text-ink"
      >
        ‹  กลับหน้าผู้ใช้
      </Link>
    </nav>
  )
}
