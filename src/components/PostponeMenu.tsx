import { useEffect, useRef, useState } from 'react'
import { useUpdateTask } from '../lib/api'
import { bangkokAt, fromLocalInput, localInput, stamp } from '../lib/time'
import type { Task } from '../lib/types'
import { useToast } from './Toast'

/**
 * เลื่อนกำหนด — Figma 433:1329 (the menu) and 433:1480 (the undo after it).
 *
 * Three answers cover nearly every "not today": later today, tomorrow morning,
 * next Monday morning; anything else is one more choice away. Numbers pick them
 * from the keyboard while the menu is open. A postpone is undoable from its
 * toast rather than confirmed beforehand: it is the commonest edit on the
 * overview and the cheapest to reverse.
 */

function choices(now: Date): { key: string; label: string; at: Date }[] {
  const bangkokDay = new Date(now.getTime() + 7 * 3_600_000).getUTCDay()
  const toMonday = ((8 - bangkokDay) % 7) || 7
  const list = [
    { key: '1', label: 'วันนี้ 17:00', at: bangkokAt(0, 17, now) },
    { key: '2', label: 'พรุ่งนี้ 09:00', at: bangkokAt(1, 9, now) },
    { key: '3', label: 'จันทร์หน้า 09:00', at: bangkokAt(toMonday, 9, now) },
  ]
  // "Later today" is no answer once 17:00 has gone.
  return list.filter((c) => c.at.getTime() > now.getTime())
}

export function PostponeButton({ task, short }: { task: Task; short?: boolean }) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [custom, setCustom] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const update = useUpdateTask()
  const toast = useToast()
  const now = new Date()
  const options = choices(now)

  const postpone = (at: string) => {
    const before = task.dueAt
    setOpen(false)
    setPicking(false)
    update.mutate({ id: task.id, patch: { dueAt: at } })
    toast({
      title: 'เลื่อนกำหนดแล้ว',
      body: `${task.title} · ${stamp(at)}`,
      action: { label: 'เลิกทำ', onAct: () => update.mutate({ id: task.id, patch: { dueAt: before } }) },
    })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (picking) {
        if (e.key === 'Escape') setPicking(false)
        return
      }
      const hit = options.find((o) => o.key === e.key)
      if (hit) {
        e.preventDefault()
        postpone(hit.at.toISOString())
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        setPicking(true)
      } else if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('mousedown', onDown)
    }
  })

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          setPicking(false)
          setCustom(task.dueAt ? localInput(task.dueAt) : '')
        }}
        className={`wc-lift min-h-[32px] rounded-control border bg-sheet px-2.5 text-[12.5px] font-medium ${open ? 'border-ink' : 'border-rule'}`}
      >
        {short ? 'เลื่อน' : 'เลื่อนกำหนด'}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`เลื่อน “${task.title}” ไป`}
          className="absolute right-0 top-full z-20 mt-1.5 w-[264px] max-w-[calc(100vw-32px)] rounded-control border border-rule bg-sheet py-2 shadow-[0_8px_28px_rgba(20,23,26,0.16)]"
        >
          <p className="px-3.5 pb-1.5 text-[12px] leading-[1.4] text-ink-3">เลื่อน “{task.title}” ไป</p>
          {options.map((o, i) => (
            <button
              key={o.key}
              type="button"
              role="menuitem"
              autoFocus={i === 0}
              onClick={() => postpone(o.at.toISOString())}
              className="flex min-h-10 w-full items-center justify-between px-3.5 py-2 text-left text-[14px] hover:bg-selected focus-visible:bg-selected"
            >
              {o.label}
              <kbd className="rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2">{o.key}</kbd>
            </button>
          ))}
          <div className="my-1 h-px bg-rule-soft" />
          {picking ? (
            <form
              className="flex gap-2 px-3.5 py-2"
              onSubmit={(e) => {
                e.preventDefault()
                const at = fromLocalInput(custom)
                if (at) postpone(at)
              }}
            >
              <input
                type="datetime-local"
                autoFocus
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                aria-label="วันและเวลาใหม่"
                className="h-9 min-w-0 flex-1 rounded-control border border-rule bg-ground px-2 font-mono text-[12px]"
              />
              <button type="submit" className="h-9 shrink-0 rounded-control bg-brand px-3 text-[12.5px] font-medium text-on-dark">เลื่อน</button>
            </form>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setPicking(true)}
              className="flex min-h-10 w-full items-center justify-between px-3.5 py-2 text-left text-[14px] hover:bg-selected focus-visible:bg-selected"
            >
              เลือกวันและเวลา…
              <kbd className="rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2">D</kbd>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
