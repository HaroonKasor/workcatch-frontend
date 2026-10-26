import { Link } from 'react-router-dom'
import { useDeletedNotes } from '../../lib/api'
import { noteCategoryLabel } from '../../lib/style'
import { sinceLabel } from '../../lib/time'
import type { Note } from '../../lib/types'
import { Icon } from './Icon'
import { MobileHeader } from './MobileHeader'
import { ListGroup } from './SwipeRow'

/**
 * บันทึก on a phone — Figma 468:1179. A row a note: a pin, a lock or a page for
 * the icon, the title, what kind it is and what it is tied to, and when it was
 * last touched. The bin is the last row.
 */
export function NotesMobile({ pinned, rest, total, filters, filter, setFilter, now, empty }: {
  pinned: Note[]
  rest: Note[]
  total: number
  filters: { key: string; label: string }[]
  filter: string
  setFilter: (key: string) => void
  now: Date
  empty?: React.ReactNode
}) {
  const bin = useDeletedNotes()
  const binCount = (bin.data ?? []).length

  const row = (n: Note) => {
    const secret = n.blocks.some((b) => b.kind === 'credentials')
    return (
      <li key={n.id} className="border-b border-rule-soft bg-sheet">
        <Link to={`/app/notes/${n.id}`} className="flex min-h-[64px] items-start gap-3 px-4 py-3">
          <Icon name={secret ? 'lock' : n.pinned ? 'pin' : 'doc'} size={18} className="mt-1.5 text-ink-2" />
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] leading-[1.35] font-medium">{n.title}</span>
            <span className="mt-0.5 block truncate text-[14px] text-ink-3">
              {[noteCategoryLabel[n.category], n.taskIds.length > 0 ? `ผูกกับ ${n.taskIds.length} งาน` : null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className="shrink-0 pt-1 text-[14px] text-ink-3">{sinceLabel(n.updatedAt, now)}</span>
        </Link>
      </li>
    )
  }

  return (
    <div className="lg:hidden">
      <MobileHeader title="บันทึก" count={total} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`min-h-11 shrink-0 rounded-pill px-4 text-[15px] ${filter === f.key ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {empty}
      {pinned.length > 0 && <ListGroup label="ปักหมุด" count={pinned.length}>{pinned.map(row)}</ListGroup>}
      {rest.length > 0 && <ListGroup label={pinned.length > 0 ? 'ล่าสุด' : 'บันทึก'} count={rest.length}>{rest.map(row)}</ListGroup>}
      <Link to="/app/notes/trash" className="flex min-h-14 items-center gap-3 border-y border-rule bg-sheet px-4 text-ink-2">
        <Icon name="trash" size={20} />
        <span className="flex-1 text-[16px]">ถังขยะ</span>
        <span className="font-mono text-[14px]">{binCount}</span>
        <Icon name="chevronRight" size={18} />
      </Link>
    </div>
  )
}
