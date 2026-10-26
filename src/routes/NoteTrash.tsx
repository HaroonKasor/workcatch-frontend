import { Link } from 'react-router-dom'
import { Skeleton, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { useDeletedNotes, useRestoreNote } from '../lib/api'
import { stamp } from '../lib/time'
import { MobileBack } from '../components/mobile/MobileHeader'
import { MobileEmpty } from '../components/mobile/States'
import type { Note } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/notes/trash — Figma node 219:28 ("บันทึก — ถังลบและการกู้คืน")
 *
 * The frame's own reason for existing, and this screen's: every delete dialog in
 * the product has said "กู้คืนได้ภายใน 30 วัน", and until now the only way to act
 * on that was the nine seconds the undo toast stayed on screen. After that the
 * note was still in the data — `deletedAt` set, filtered out of every list — and
 * unreachable from anywhere. A promise with no screen behind it is a false one.
 *
 * Credentials are the documented exception and the frame says so at the bottom,
 * in the sentence reproduced verbatim below: the values were destroyed at the
 * moment of deletion, so what comes back is the content and not the secrets.
 */

/** BR: the bin holds a note for 30 days. Stated once; the row does the counting. */
const RETENTION_DAYS = 30

/** Whole days left before the server clears it out for good. Never below zero. */
function daysLeft(deletedAt: string, now: Date): number {
  const gone = (now.getTime() - new Date(deletedAt).getTime()) / 86_400_000
  return Math.max(0, Math.ceil(RETENTION_DAYS - gone))
}

export default function NoteTrash() {
  const { data, isPending } = useDeletedNotes()
  const restore = useRestoreNote()
  const toast = useToast()
  const now = useNow()

  if (isPending) return <TrashSkeleton />

  const notes = data ?? []

  return (
    <>
      <div className="-mx-5 -mt-3 lg:hidden"><MobileBack to="/app/notes" label="บันทึก" /></div>
      <p className="t-eyebrow text-ink-3 max-lg:hidden">
        <Link to="/app/notes" className="hover:text-ink-2">บันทึก</Link>
        {'  ›  '}
        ถังขยะ
      </p>
      <h1 className="t-page-title mt-1 max-lg:text-[32px]">ถังขยะ</h1>
      {notes.length > 0 && (
        <ul className="-mx-5 mt-3 border-y border-rule lg:hidden">
          {notes.map((n) => (
            <li key={n.id} className="flex min-h-[64px] items-center gap-3 border-b border-rule-soft bg-sheet px-4 py-3 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] leading-[1.35]">{n.title}</span>
                <span className="block text-[14px] text-ink-3">
                  ลบเมื่อ {n.deletedAt ? stamp(n.deletedAt).replace(/ \d{2}:\d{2}$/, '') : '—'} · เหลือ {daysLeft(n.deletedAt ?? new Date().toISOString(), now)} วัน
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  restore.mutate(n)
                  toast({ title: 'กู้คืนบันทึกแล้ว' })
                }}
                className="min-h-11 shrink-0 px-2 text-[16px] font-medium text-brand-strong"
              >
                กู้คืน<span className="sr-only"> {n.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {notes.length === 0 ? (
        <>
          <div className="lg:hidden"><MobileEmpty icon="trash">ถังขยะว่าง</MobileEmpty></div>
          <div className="mt-7 rounded-sheet border border-rule bg-sheet px-8 py-11 max-lg:hidden">
            <p className="t-section">ถังขยะว่าง</p>
            <Link to="/app/notes" className="wc-lift mt-5 inline-flex min-h-11 items-center rounded-control border border-rule px-4.5 text-[13px] font-medium">กลับไปที่บันทึก</Link>
          </div>
        </>
      ) : (
        <div className="mt-7 overflow-hidden rounded-sheet border border-rule bg-sheet max-lg:hidden">
          {/* The column names only exist where there are columns. At 390px each
              entry is a stacked block and every value says what it is in the
              line itself, so a header row would be naming things that are no
              longer beside each other. */}
          <div className="hidden bg-ground px-4 py-3 lg:flex" aria-hidden>
            <span className="t-label w-[360px] shrink-0 text-ink-3">ชื่อบันทึก</span>
            <span className="t-label w-[180px] shrink-0 text-ink-3">ลบเมื่อ</span>
            <span className="t-label flex-1 text-ink-3">ลบถาวรอีก</span>
          </div>

          <ul>
            {notes.map((n) => (
              <TrashRow
                key={n.id}
                note={n}
                left={daysLeft(n.deletedAt ?? new Date().toISOString(), now)}
                onRestore={() => {
                  restore.mutate(n)
                  toast({
                    title: 'กู้คืนบันทึกแล้ว',
                    body: 'เนื้อหากลับมาครบ · ค่าที่ซ่อนไว้ถูกลบไปตั้งแต่ตอนกดลบ ต้องกรอกใหม่',
                  })
                }}
              />
            ))}
          </ul>
        </div>
      )}

    </>
  )
}

/**
 * One entry. The countdown turns warm in its last week — time/soon, because this
 * is a deadline like any other — and keeps the words "ลบถาวรอีก" beside it, so
 * the urgency is legible to a reader who cannot pick the amber out.
 */
function TrashRow({ note, left, onRestore }: {
  note: Note
  left: number
  onRestore: () => void
}) {
  const closing = left <= 7

  return (
    <li className="flex items-center gap-4 border-t border-rule-soft px-4 py-3.5">
      {/* One row of columns on a display wide enough for columns; a stack on a
          phone, where each value names itself because the header is gone. */}
      <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-4">
        <span className="block text-[13px] leading-[1.45] lg:w-[360px] lg:shrink-0">
          {note.title}
        </span>
        <span className="mt-1 block font-mono text-[12px] text-ink-3 lg:mt-0 lg:w-[180px] lg:shrink-0">
          <span className="lg:hidden">ลบเมื่อ </span>
          {note.deletedAt ? stamp(note.deletedAt) : '—'}
        </span>
        <span
          className={`mt-1 block font-mono text-[12px] lg:mt-0 lg:flex-1 ${
            closing ? 'font-medium text-time-soon-strong' : 'text-ink-2'
          }`}
        >
          <span className="lg:hidden">ลบถาวรอีก </span>
          {left} วัน
        </span>
      </div>
      <button
        type="button"
        onClick={onRestore}
        className="wc-lift min-h-11 shrink-0 rounded-control border border-rule px-3.5 text-[13px] font-medium text-ink-2"
      >
        กู้คืน<span className="sr-only"> {note.title}</span>
      </button>
    </li>
  )
}

function TrashSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดถังลบ">
      <SkeletonPageHeader />
      <div className="mt-7 rounded-sheet border border-rule bg-sheet px-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton w="42%" h="13px" />
            <Skeleton w="110px" h="11px" />
            <Skeleton w="70px" h="11px" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  )
}
