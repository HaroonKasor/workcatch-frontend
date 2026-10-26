import { useState } from 'react'
import { usePostpone } from './usePostpone'
import { bangkokAt, clock, fromLocalInput, localInput } from '../../lib/time'
import type { Task } from '../../lib/types'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'

/**
 * เลื่อนกำหนด on a phone — Figma 461:397. Three answers and a calendar:
 * tomorrow, the weekend, next week, or any day. A postpone is undone from its
 * toast, never confirmed first.
 */

/** "พ. 9 ก.ย. 09:00" */
function shortStamp(d: Date): string {
  const day = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }).format(d)
  return `${day} ${clock(d.toISOString())}`
}

function choices(now: Date): { label: string; at: Date }[] {
  const dow = new Date(now.getTime() + 7 * 3_600_000).getUTCDay()
  const toSaturday = ((6 - dow + 7) % 7) || 7
  const toMonday = ((8 - dow) % 7) || 7
  const list = [
    { label: 'พรุ่งนี้', at: bangkokAt(1, 9, now) },
    { label: 'สุดสัปดาห์', at: bangkokAt(toSaturday, 9, now) },
    { label: 'สัปดาห์หน้า', at: bangkokAt(toMonday, 9, now) },
  ]
  // On a Friday "the weekend" starts tomorrow; two rows for one answer is noise.
  return list.filter((c, i) => list.findIndex((o) => o.at.getTime() === c.at.getTime()) === i)
}

export function PostponeSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const postpone = usePostpone()
  const [picking, setPicking] = useState(false)
  const [custom, setCustom] = useState('')
  const options = choices(new Date())

  const go = (at: string) => {
    if (!task) return
    postpone(task, at)
    setPicking(false)
    onClose()
  }
  const close = () => {
    setPicking(false)
    onClose()
  }

  return (
    <BottomSheet
      open={!!task}
      onClose={close}
      title="เลื่อนกำหนด"
      aside={task?.dueAt ? <span className="font-mono text-[14px] text-time-soon-strong">เดิม {clock(task.dueAt)}</span> : undefined}
      footer={
        <button type="button" onClick={close} className="wc-lift min-h-12 w-full rounded-control border border-rule bg-sheet text-[16px] font-medium">
          ยกเลิก
        </button>
      }
    >
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => go(o.at.toISOString())}
          className="flex min-h-[52px] w-full items-center justify-between gap-3 border-t border-rule-soft px-4 text-left first:border-t-0 active:bg-ink/[0.04]"
        >
          <span className="text-[16px]">{o.label}</span>
          <span className="font-mono text-[14px] text-ink-2">{shortStamp(o.at)}</span>
        </button>
      ))}
      {picking ? (
        <form
          className="flex gap-2 border-t border-rule-soft px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault()
            const at = fromLocalInput(custom)
            if (at) go(at)
          }}
        >
          <input
            type="datetime-local"
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            aria-label="วันและเวลาใหม่"
            className="h-11 min-w-0 flex-1 rounded-control border border-rule bg-ground px-2 font-mono text-[14px]"
          />
          <button type="submit" disabled={!fromLocalInput(custom)} className="h-11 shrink-0 rounded-control bg-brand-strong px-4 text-[14px] font-medium text-on-dark disabled:opacity-55">เลื่อน</button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => { setCustom(task?.dueAt ? localInput(task.dueAt) : ''); setPicking(true) }}
          className="flex min-h-[52px] w-full items-center justify-between gap-3 border-t border-rule-soft px-4 text-left active:bg-ink/[0.04]"
        >
          <span className="text-[16px]">เลือกวัน</span>
          <Icon name="chevronRight" size={18} className="text-ink-3" />
        </button>
      )}
      <div className="border-t border-rule-soft" />
    </BottomSheet>
  )
}
