import { Link, useLocation } from 'react-router-dom'
import { projectDot } from '../lib/style'
import type { Project } from '../lib/types'

export interface RailCounts {
  inbox: number
  overdue: number
  open: number
  waiting: number
}

/**
 * Left rail — Figma node 33:44. Present on every authenticated screen.
 *
 * The overdue count is the one number allowed to carry a warm colour here,
 * because it is literally a statement about time. Project dots are cool by
 * construction (the type only permits cool hues), so the two can never be
 * confused at a glance.
 */
export function AppRail({ counts, projects }: { counts: RailCounts; projects: Project[] }) {
  return (
    <nav
      aria-label="เมนูหลัก"
      className="sticky top-0 h-dvh w-rail shrink-0 overflow-y-auto border-r border-rule bg-sheet px-5 pt-6 pb-7"
    >
      <div>
        <p className="t-wordmark">WorkCatch</p>
        <p className="t-meta text-ink-3">ไม่ให้งานหล่น</p>
      </div>

      <button
        type="button"
        className="mt-6 flex w-full items-center justify-between rounded-control bg-ink px-3.5 py-2.5 text-on-dark"
      >
        <span className="font-mono text-[15px] leading-none">+</span>
        <span className="text-[13px] font-medium">เพิ่มงาน</span>
        {/* NFR-UX-01: adding a task must cost at most two interactions, so the
            keyboard route is advertised rather than hidden in a help page. */}
        <span className="font-mono text-[11px] opacity-45">N</span>
      </button>

      <Group label="วันนี้">
        <Item to="/app/dashboard" label="ภาพรวม" />
        <Item to="/app/inbox" label="กล่องรับงาน" count={counts.inbox} />
        <Item to="/app/tasks?filter=overdue" label="เกินกำหนด" count={counts.overdue} alert />
      </Group>

      <Group label="มุมมอง">
        <Item to="/app/tasks" label="รายการงาน" count={counts.open} />
        <Item to="/app/board" label="บอร์ด" />
        <Item to="/app/calendar" label="ปฏิทิน" />
        <Item to="/app/tasks?filter=waiting" label="รอคนอื่น" count={counts.waiting} />
      </Group>

      <Group label="โปรเจกต์">
        {projects.map((p) => (
          <Item key={p.id} to={`/app/projects/${p.id}`} label={p.name} dot={projectDot[p.color]} />
        ))}
      </Group>

      <Group label="ระบบ">
        <Item to="/app/notifications" label="ประวัติแจ้งเตือน" />
        <Item to="/app/settings" label="ตั้งค่า" />
      </Group>
    </nav>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <p className="t-label text-ink-3 px-3 pb-2">{label}</p>
      {children}
    </div>
  )
}

function Item({ to, label, count, alert, dot }: {
  to: string; label: string; count?: number; alert?: boolean; dot?: string
}) {
  const { pathname, search } = useLocation()
  const [toPath, toSearch = ''] = to.split('?')

  // NavLink ignores the query string, so /app/tasks, /app/tasks?filter=overdue
  // and /app/tasks?filter=waiting would all light up at once. Compare both parts.
  const isActive =
    pathname === toPath &&
    new URLSearchParams(search).get('filter') === (new URLSearchParams(toSearch).get('filter'))

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'flex items-center justify-between gap-2 rounded-control px-3 py-1.5',
        // A solid token, not ink at 6% opacity: one value the whole system can
        // point at, and one place to change it.
        isActive ? 'bg-selected text-ink font-medium' : 'text-ink-2 hover:bg-ink/[0.03]',
      ].join(' ')}
    >
      <span className="flex min-w-0 items-center gap-2.5 text-[13px]">
        {dot && <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <span className={`font-mono text-[11px] ${alert ? 'text-time-late font-semibold' : 'text-ink-3'}`}>
          {count}
        </span>
      )}
    </Link>
  )
}
