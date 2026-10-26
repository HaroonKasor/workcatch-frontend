import { Link, useLocation } from 'react-router-dom'
import { useQuickAdd } from './QuickAdd'
import { Icon, type IconName } from './mobile/Icon'

/**
 * The phone's bottom bar — Figma 457:4.
 *
 * วันนี้ · รับงาน · + เพิ่ม · งาน · บันทึก. Each place has an icon and its word,
 * and the one count that matters — what is waiting in the inbox — sits beside
 * its label rather than as a badge, so it is read as part of the name. The add
 * button is the centre slot and opens Quick Add directly; the AI lives in the top
 * bar, and settings, projects and notifications in the profile menu.
 *
 * Hidden on a task, where the sheet's own actions (เลื่อน, ปิดงานนี้) take the
 * bottom edge.
 */

interface Tab {
  to: string
  label: string
  icon: IconName
  match: (p: string) => boolean
}

const LEFT: Tab[] = [
  { to: '/app/dashboard', label: 'วันนี้', icon: 'sun', match: (p) => p === '/app' || p.startsWith('/app/dashboard') },
  { to: '/app/inbox', label: 'รับงาน', icon: 'inbox', match: (p) => p.startsWith('/app/inbox') },
]

const RIGHT: Tab[] = [
  // The calendar and board have no tab of their own; they are reached from งาน.
  { to: '/app/tasks', label: 'งาน', icon: 'tasks', match: (p) => p === '/app/tasks' || p.startsWith('/app/calendar') || p.startsWith('/app/board') },
  { to: '/app/notes', label: 'บันทึก', icon: 'doc', match: (p) => p.startsWith('/app/notes') },
]

export function MobileTabs({ inbox }: { inbox: number }) {
  const { pathname } = useLocation()
  const quickAdd = useQuickAdd()
  if (/^\/app\/(tasks\/[^/]+|upgrade|connect-line|notes\/(?!trash))/.test(pathname)) return null

  return (
    <nav
      aria-label="เมนูหลักสำหรับมือถือ"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-sheet lg:hidden"
      // The home indicator on a modern phone overlaps a bar pinned to the very
      // bottom edge, so the bar has to end above it.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[64px] max-w-[560px] items-stretch">
        {LEFT.map((t) => (
          <TabLink key={t.to} {...t} active={t.match(pathname)} count={t.to.endsWith('inbox') ? inbox : 0} />
        ))}

        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={quickAdd.open}
            aria-label="เพิ่ม"
            className="wc-lift group flex min-h-11 flex-col items-center gap-0.5"
          >
            {/* brand/strong, not emerald: the plus is white and has to be seen. */}
            <span className="flex h-[32px] w-14 items-center justify-center rounded-pill bg-brand-strong text-on-dark">
              <Icon name="plus" size={22} />
            </span>
            <span className="text-[13px] leading-none font-medium">เพิ่ม</span>
          </button>
        </div>

        {RIGHT.map((t) => (
          <TabLink key={t.to} {...t} active={t.match(pathname)} count={0} />
        ))}
      </div>
    </nav>
  )
}

function TabLink({ to, label, icon, active, count }: Tab & { active: boolean; count: number }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[13px] ${
        active ? 'font-medium text-ink' : 'text-ink-3'
      }`}
    >
      <Icon name={icon} size={22} />
      {/* The label never wraps: half a Thai word is not a shorter Thai word. */}
      <span className="flex items-baseline gap-1 leading-none whitespace-nowrap">
        {label}
        {count > 0 && <span className="font-mono text-[13px] font-semibold text-ink-2">{count}</span>}
      </span>
    </Link>
  )
}
