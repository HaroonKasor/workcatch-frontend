import { Link, useLocation } from 'react-router-dom'
import { useMe } from '../lib/api'
import { projectDot } from '../lib/style'
import type { Project } from '../lib/types'
import { useQuickAdd } from './QuickAdd'
import { shortcutLabel, useAiPanel } from '../lib/aiPanel'
import markA from '../assets/mark-a.svg'

export interface RailCounts {
  inbox: number
  overdue: number
  open: number
  waiting: number
  notes: number
}

/**
 * Left rail — Figma node 33:44. Present on every authenticated screen.
 *
 * The overdue count is the one number allowed to carry a warm colour here,
 * because it is literally a statement about time. Project dots are cool by
 * construction (the type only permits cool hues), so the two can never be
 * confused at a glance.
 */
export function AppRail({ counts, projects, projectCounts }: { counts: RailCounts; projects: Project[]; projectCounts?: Record<string, number> }) {
  const me = useMe()
  const quickAdd = useQuickAdd()
  const ai = useAiPanel()

  return (
    <nav
      aria-label="เมนูหลัก"
      className="no-scrollbar sticky top-0 h-viewport w-rail shrink-0 overflow-y-auto overscroll-contain border-r border-rule bg-sheet px-5 pt-6 pb-7"
    >
      {/* Logo v2 — Figma 440:2247: the mark, the wordmark, and the tagline
          indented to start under the wordmark rather than under the mark. */}
      <div className="flex flex-col gap-px">
        <div className="flex items-center gap-2">
          <img src={markA} width={24} height={24} alt="" />
          <p className="t-wordmark">WorkCatch</p>
        </div>
        <p className="t-meta pl-8 text-ink-3">ไม่ให้งานหล่น</p>
      </div>

      {/* v2 (440:2245, 423:1468): one primary action on every screen, adding
          work — the notes page carries its own "+ บันทึกใหม่". brand/strong, as
          in the frame: white on brand/emerald fails contrast. */}
      <button
        type="button"
        onClick={quickAdd.open}
        className="wc-lift mt-[26px] flex w-full items-center justify-between rounded-control bg-brand-strong py-3 pr-4 pl-5 text-on-dark"
      >
        <span className="text-[13px] font-medium">เพิ่มงาน</span>
        {/* NFR-UX-01: adding a task must cost at most two interactions, so the
            keyboard route is advertised rather than hidden in a help page. */}
        <span className="font-mono text-[12px] opacity-70">N</span>
      </button>

      {/* Figma 445:2643. Outlined, never a second green button: there is one
          primary action on this rail and it is adding work. Drawn in its
          "open" state while the panel is showing. */}
      <button
        type="button"
        onClick={ai.toggle}
        aria-expanded={ai.isOpen}
        className={`wc-lift mt-2 flex w-full items-center justify-between rounded-control py-[9px] pr-3 pl-4 ${
          ai.isOpen ? 'border-[1.5px] border-ink bg-ground' : 'border border-rule bg-sheet'
        }`}
      >
        <span className="text-[14px] font-medium">ถาม AI</span>
        <kbd className="rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2">{shortcutLabel('J')}</kbd>
      </button>

      <Group label="วันนี้">
        <Item to="/app/dashboard" label="ภาพรวม" />
        <Item to="/app/inbox" label="กล่องรับงาน" count={counts.inbox} />
        <Item to="/app/tasks?status=overdue" label="เกินกำหนด" count={counts.overdue} alert />
      </Group>

      <Group label="มุมมอง">
        <Item to="/app/tasks" label="รายการงาน" count={counts.open} />
        <Item to="/app/board" label="บอร์ด" />
        <Item to="/app/calendar" label="ปฏิทิน" />
        <Item to="/app/tasks?status=WAITING" label="รอคนอื่น" count={counts.waiting} />
        {/* Notes sit in มุมมอง rather than in a group of their own — Figma
            127:1083. They are a way of looking at the same work, not a system
            setting. */}
        <Item to="/app/notes" label="บันทึก" count={counts.notes} />
      </Group>

      <Group label="โปรเจกต์">
        {/* The filtered task list, which is what a project actually is here.
            These used to point at /app/projects/<id>, a route that rendered the
            unfiltered project grid for any id at all — the same page whatever
            you clicked, and the same page for an id that did not exist. */}
        {projects.map((p) => (
          <Item
            key={p.id}
            to={`/app/projects/${p.id}`}
            label={p.name}
            dot={projectDot[p.color]}
            count={projectCounts?.[p.id]}
          />
        ))}
      </Group>

      <Group label="ระบบ">
        <Item to="/app/notifications" label="ประวัติแจ้งเตือน" />
        <Item to="/app/settings" label="ตั้งค่า" />
        {/* The bridge into the admin area. It existed only as a URL you had to
            know, which is not a route — it is a secret handshake. Shown only to
            accounts that hold the role; the API enforces the rest. */}
        {me.data?.admin && <Item to="/admin" label="โหมดผู้ดูแลระบบ" />}
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

  // NavLink ignores the query string, so /app/tasks, /app/tasks?status=overdue
  // and /app/tasks?project=p2 would all light up at once. Compare both parts —
  // every key this rail actually varies, or the project rows and รายการงาน all
  // read as the current page together.
  const here = new URLSearchParams(search)
  const there = new URLSearchParams(toSearch)
  const isActive =
    pathname === toPath &&
    ['status', 'project'].every((k) => here.get(k) === there.get(k))

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'wc-lift flex items-center justify-between gap-2 rounded-control px-3 py-1.5',
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
