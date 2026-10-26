import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotes, useTasks } from '../lib/api'
import { noteCategoryLabel } from '../lib/style'
import { gutterLabel, timeStateOf } from '../lib/time'
import { shortcutLabel, useAiPanel } from '../lib/aiPanel'
import { useQuickAdd } from './QuickAdd'

/**
 * ค้นหา — Figma 433:2513. ⌘K / Ctrl+K, or "/" when not typing, from anywhere in
 * the app; the AI panel's "ค้นหาแบบปกติ" opens it too, so a busy or exhausted AI
 * never leaves somebody without a way to find their work.
 *
 * It searches what the browser already holds — task titles, note titles — with
 * no request of its own, so it answers as fast as it can be typed into and works
 * the same on the local store. Note BODIES are not searched here: a secret block
 * must never surface in a result line.
 *
 * Also owns the "g then i" key sequence its command row advertises.
 */

interface Row {
  key: string
  section: 'งาน' | 'บันทึก' | 'คำสั่ง'
  label: string
  meta?: string
  late?: boolean
  kbd?: string
  /** A page to go to, or one of the commands below. */
  to?: string
  command?: 'add' | 'ai'
}

export function SearchPalette() {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const tasks = useTasks()
  const notes = useNotes()
  const navigate = useNavigate()
  const quickAdd = useQuickAdd()
  const ai = useAiPanel()
  const listId = useId()

  const show = () => {
    setQuery('')
    setActive(0)
    setOpen(true)
    queueMicrotask(() => ref.current?.showModal())
  }
  const hide = () => ref.current?.close()

  useEffect(() => {
    let lastG = 0
    const typing = () => {
      const el = document.activeElement
      return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        show()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing() || document.querySelector('dialog[open]')) return
      if (e.key === '/') {
        e.preventDefault()
        show()
      } else if (e.key === 'g' || e.key === 'G') {
        lastG = Date.now()
      } else if ((e.key === 'i' || e.key === 'I') && Date.now() - lastG < 1200) {
        e.preventDefault()
        navigate('/app/inbox')
      }
    }
    const onEvent = () => show()
    document.addEventListener('keydown', onKey)
    document.addEventListener('wc:open-search', onEvent)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('wc:open-search', onEvent)
    }
  }, [navigate])

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    const taskRows: Row[] = q
      ? (tasks.data ?? [])
        .filter((t) => t.status !== 'CANCELLED' && t.title.toLowerCase().includes(q))
        .slice(0, 5)
        .map((t) => ({
          key: `t-${t.id}`,
          section: 'งาน',
          label: t.title,
          meta: [t.status === 'INBOX' ? 'กล่องรับงาน' : gutterLabel(t, now), t.project?.name].filter(Boolean).join(' · '),
          late: timeStateOf(t, now) === 'late',
          to: `/app/tasks/${t.id}`,
        }))
      : []
    const noteRows: Row[] = q
      ? (notes.data ?? [])
        .filter((n) => n.title.toLowerCase().includes(q))
        .slice(0, 3)
        .map((n) => ({ key: `n-${n.id}`, section: 'บันทึก', label: n.title, meta: noteCategoryLabel[n.category], to: `/app/notes/${n.id}` }))
      : []
    const commands: Row[] = [
      { key: 'c-add', section: 'คำสั่ง', label: 'เพิ่มงาน', kbd: 'N', command: 'add' },
      { key: 'c-inbox', section: 'คำสั่ง', label: 'ไปที่กล่องรับงาน', kbd: 'G I', to: '/app/inbox' },
      { key: 'c-ai', section: 'คำสั่ง', label: 'ถาม AI', kbd: shortcutLabel('J'), command: 'ai' },
      { key: 'c-tasks', section: 'คำสั่ง', label: 'ไปที่รายการงาน', to: '/app/tasks' },
    ].filter((c) => !q || c.label.toLowerCase().includes(q)) as Row[]
    return [...taskRows, ...noteRows, ...commands]
  }, [query, tasks.data, notes.data])

  const run = (row: Row) => {
    hide()
    if (row.to) navigate(row.to)
    else if (row.command === 'add') quickAdd.open()
    else if (row.command === 'ai') ai.open()
  }

  const current = Math.min(active, Math.max(rows.length - 1, 0))

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      aria-label="ค้นหา"
      className="m-0 mt-[12vh] w-full max-w-none bg-transparent p-0 px-4 backdrop:bg-ink/35 sm:mx-auto sm:w-[640px] sm:px-0"
      onClick={(e) => { if (e.target === ref.current) hide() }}
    >
      {open && (
        <div className="overflow-hidden rounded-control bg-sheet pb-2 shadow-[0_8px_28px_rgba(20,23,26,0.16)]">
          <div className="flex items-center justify-between gap-3 border-b border-rule-soft py-4 pr-4 pl-5">
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((current + 1) % Math.max(rows.length, 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((current - 1 + rows.length) % Math.max(rows.length, 1))
                } else if (e.key === 'Enter' && rows[current]) {
                  e.preventDefault()
                  run(rows[current])
                }
              }}
              placeholder="ค้นหางาน บันทึก หรือคำสั่ง"
              aria-label="ค้นหา"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={rows[current] ? `${listId}-${rows[current].key}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-[17px] placeholder:text-ink-3 focus:outline-none"
            />
            <kbd className="shrink-0 rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2">Esc</kbd>
          </div>
          <ul id={listId} role="listbox" aria-label="ผลการค้นหา" className="max-h-[60vh] overflow-y-auto">
            {rows.length === 0 && <li className="px-5 py-4 text-[13px] text-ink-3">ไม่พบงานหรือบันทึกที่ตรงกับคำค้น</li>}
            {rows.map((r, i) => (
              <li key={r.key} role="presentation">
                {(i === 0 || rows[i - 1].section !== r.section) && (
                  <p className="pt-3 pb-1 pl-5 text-[12px] font-medium text-ink-3">{r.section}</p>
                )}
                <div
                  id={`${listId}-${r.key}`}
                  role="option"
                  aria-selected={i === current}
                  onClick={() => run(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 py-[9px] pr-4 pl-5 ${i === current ? 'bg-selected' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`truncate text-[14px] ${i === current ? 'font-medium' : ''}`}>{r.label}</span>
                    {r.meta && <span className={`hidden shrink-0 text-[12px] sm:inline ${r.late ? 'text-time-late' : 'text-ink-3'}`}>{r.meta}</span>}
                  </span>
                  {(r.kbd || i === current) && (
                    <kbd className="shrink-0 rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2">
                      {i === current && r.section !== 'คำสั่ง' ? 'Enter' : r.kbd ?? 'Enter'}
                    </kbd>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </dialog>
  )
}
