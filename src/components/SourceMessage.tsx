import { fullDate } from '../lib/time'
import type { Task } from '../lib/types'

/**
 * The LINE message a draft was read from: read-only, because it is what was
 * sent, not something to edit, and erased 30 days after it arrived. Shown only
 * while it still exists.
 */
export function SourceMessage({ task }: { task: Task }) {
  return (
    <div className="mt-3.5 rounded-sheet bg-ground px-3 py-2.5">
      <p className="t-label text-ink-3">ข้อความต้นฉบับจาก LINE</p>
      <p className="mt-1 whitespace-pre-line text-[12px] leading-[1.45] text-ink-2">{task.sourceMessage}</p>
      <p className="t-meta mt-1.5 text-ink-3">
        {task.sourceMessageExpiresAt
          ? `แก้ไขไม่ได้ · ลบอัตโนมัติ ${fullDate(task.sourceMessageExpiresAt)}`
          : 'แก้ไขไม่ได้ · ลบอัตโนมัติเมื่อครบ 30 วันหลังได้รับ'}
      </p>
    </div>
  )
}
