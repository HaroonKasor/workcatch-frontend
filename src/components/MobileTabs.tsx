import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuickAdd } from './QuickAdd'
import { useAiPanel } from '../lib/aiPanel'

/**
 * The phone's only navigation — Figma node 184:1511.
 *
 * Six slots, with the add button in the middle: ภาพรวม · รับงาน · + เพิ่ม · งาน ·
 * บันทึก · ตั้งค่า. The rail's full list belongs on a display that can hold it;
 * a phone gets what this product is actually for, plus the add button, which is
 * the most frequent action and therefore sits under the thumb.
 *
 * "รับงาน" is the inbox. The full กล่องรับงาน does not fit a 65px cell
 * and truncating a Thai word mid-syllable is worse than shortening it on purpose.
 *
 * The calendar gave up its slot instead: it is a way of looking at tasks, so it
 * lives under งาน — the same grouping the desktop rail uses under มุมมอง.
 */

interface Tab {
  to: string
  label: string
  match: (p: string) => boolean
}

const LEFT: Tab[] = [
  { to: '/app/dashboard', label: 'ภาพรวม', match: (p) => p === '/app' || p.startsWith('/app/dashboard') },
  { to: '/app/inbox', label: 'รับงาน', match: (p) => p.startsWith('/app/inbox') },
]

const RIGHT: Tab[] = [
  // The calendar has no tab of its own; it is reached from งาน.
  { to: '/app/tasks', label: 'งาน', match: (p) => p.startsWith('/app/tasks') || p.startsWith('/app/calendar') || p.startsWith('/app/board') },
  { to: '/app/notes', label: 'บันทึก', match: (p) => p.startsWith('/app/notes') },
  { to: '/app/settings', label: 'ตั้งค่า', match: (p) => p.startsWith('/app/settings') },
]

export function MobileTabs({ inbox, overdue }: { inbox: number; overdue: number }) {
  const { pathname } = useLocation()
  const quickAdd = useQuickAdd()
  const ai = useAiPanel()
  const [adding, setAdding] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Escape closes the sheet; the scrim behind it handles taps.
  useEffect(() => {
    if (!adding) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAdding(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [adding])

  return (
    <nav
      aria-label="เมนูหลักสำหรับมือถือ"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-sheet lg:hidden"
      // The home indicator on a modern phone overlaps a bar pinned to the very
      // bottom edge, so the bar has to end above it.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[62px] max-w-[560px] items-stretch">
        {LEFT.map((t) => (
          <Tab
            key={t.to}
            {...t}
            active={t.match(pathname)}
            badge={t.to.endsWith('inbox') ? inbox : 0}
            unit={t.to.endsWith('inbox') ? 'รอจัด' : undefined}
          />
        ))}

        {/*
          The centre slot — Figma 184:1433. A 56x44 pill, not a circle, and the
          word is ON it rather than only in an aria-label: a lone "+" is the one
          control on this bar that does not say what it does, and it is the one
          people press most.

          brand/strong rather than brand/emerald because the label is white and
          has to be read: white on emerald measures 4.02:1 and fails, on
          brand/strong it is 5.7:1.
        */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-haspopup="dialog"
            aria-expanded={adding}
            className="wc-lift flex h-11 w-14 items-center justify-center gap-1 rounded-control bg-brand-strong text-on-dark"
          >
            <span className="font-mono text-[13px] leading-none" aria-hidden>+</span>
            <span className="text-[12px] font-medium leading-none">เพิ่ม</span>
          </button>
        </div>

        {RIGHT.map((t) => (
          <Tab
            key={t.to}
            {...t}
            active={t.match(pathname)}
            badge={t.to.endsWith('tasks') ? overdue : 0}
            unit={t.to.endsWith('tasks') ? 'เกิน' : undefined}
            alert={t.to.endsWith('tasks')}
          />
        ))}
      </div>

      {/* Figma 447:2484. The phone has no rail to hold the button, so it floats
          above the tab bar, clear of the add pill in the middle. */}
      {!ai.isOpen && !adding && (
        <button
          type="button"
          onClick={ai.open}
          className="wc-lift fixed right-4 z-30 flex h-11 items-center rounded-pill bg-ink px-4 text-[14px] font-medium text-on-dark shadow-[0_6px_18px_rgba(20,23,26,0.18)]"
          style={{ bottom: 'calc(62px + 16px + env(safe-area-inset-bottom))' }}
        >
          ถาม AI
        </button>
      )}

      {adding && <AddSheet ref={sheetRef} onClose={() => setAdding(false)} onTask={quickAdd.open} />}
    </nav>
  )
}

/**
 * "จะเพิ่มอะไร" — Figma 242:1585.
 *
 * A bottom sheet rather than a popover, matching the Quick Add sheet this button
 * used to open directly: it comes from the same place, is reachable by the same
 * thumb, and has room to say what each choice IS. A two-item popover of bare
 * labels made "บันทึก" look like a second kind of task, which is the one
 * misunderstanding this screen exists to prevent.
 */
function AddSheet({ ref, onClose, onTask }: {
  ref: React.Ref<HTMLDivElement>
  onClose: () => void
  onTask: () => void
}) {
  const navigate = useNavigate()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/35" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="จะเพิ่มอะไร"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[14px] border border-rule bg-sheet px-5 pt-4 pb-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mx-auto h-1 w-10 rounded-pill bg-rule" aria-hidden />
        <p className="font-display mt-3 text-[17px] leading-[1.3] font-medium">จะเพิ่มอะไร</p>

        <div className="mt-3.5 space-y-2">
          <Choice
            title="เพิ่มงาน"
            body="สิ่งที่ต้องทำ มีกำหนดส่งและการเตือน"
            onClick={() => { onClose(); onTask() }}
          />
          <Choice
            title="เพิ่มบันทึก"
            body="วิธีทำงาน ขั้นตอน ลิงก์ หรือข้อมูลเข้าสู่ระบบ"
            onClick={() => { onClose(); void navigate('/app/notes/new') }}
          />
        </div>
      </div>
    </>
  )
}

function Choice({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wc-lift w-full rounded-control border border-rule bg-sheet px-3.5 py-3 text-left"
    >
      <span className="block text-[14px] font-medium">{title}</span>
      <span className="t-note mt-1 block text-ink-3">{body}</span>
    </button>
  )
}

function Tab({
  to,
  label,
  active,
  badge,
  unit,
  alert,
}: {
  to: string
  label: string
  active: boolean
  badge?: number
  /** The word that says what the number counts. Never optional in practice. */
  unit?: string
  alert?: boolean
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      // min-h-11 keeps the target at 44px even though the bar itself is 62px
      // tall including its label row.
      className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[12px] ${
        active ? 'font-medium text-ink' : 'text-ink-3'
      }`}
    >
      {/* The label never wraps: a 65px cell will happily break a Thai word in
          half, and half a Thai word is not a shorter Thai word. */}
      <span className="whitespace-nowrap">{label}</span>
      {/* A bare red number would be colour doing all the work. The word says
          what it counts, so the count means the same thing to a reader who
          cannot pick the red out. */}
      {!!badge && badge > 0 && (
        <span className={`whitespace-nowrap font-mono text-[12px] ${alert ? 'text-time-late' : 'text-ink-2'}`}>
          {unit} {badge}
        </span>
      )}
      {/* The active mark is a rule, like every other state in this product. */}
      <span className={`h-px w-5 ${active ? 'bg-ink' : 'bg-transparent'}`} aria-hidden />
    </Link>
  )
}
