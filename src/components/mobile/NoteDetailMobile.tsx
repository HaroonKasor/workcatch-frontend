import { useState } from 'react'
import { Link } from 'react-router-dom'
import { statusLabel, projectDot, noteCategoryLabel } from '../../lib/style'
import { clock, gutterLabel, sinceLabel, timeStateOf } from '../../lib/time'
import { timeText } from '../../lib/style'
import type { Note, Project, Task } from '../../lib/types'
import { CredentialsBlock } from '../Credentials'
import { BottomSheet, SheetItem } from './BottomSheet'
import { Icon } from './Icon'
import { MobileBack } from './MobileHeader'
import { ListGroup } from './SwipeRow'

/**
 * บันทึก on a phone — Figma 468:1316. A back bar with แก้ไข and ···, the title and
 * what it belongs to, then the note as bands: its steps, its links and people,
 * and the tasks it is tied to. Pinning, a review date and deleting live in the
 * ··· sheet. Ticking a checklist is the one live control, as on a desktop.
 */
export function NoteDetailMobile({ note, project, tasks, now, onTick, onPin, onReview, onDelete, onRevert }: {
  note: Note
  project?: Project
  tasks: Task[]
  now: Date
  onTick: (blockId: string, itemId: string) => void
  onPin: () => void
  onReview: (value: string) => void
  onDelete: () => void
  onRevert: (version: number) => void
}) {
  const [menu, setMenu] = useState(false)
  const [review, setReview] = useState(false)
  const blocks = note.blocks
  const linked = tasks.filter((t) => note.taskIds.includes(t.id))
  const intro = blocks.find((b) => b.kind === 'text')

  return (
    <div className="-mx-5 -mt-3 lg:hidden">
      <MobileBack to="/app/notes" label="บันทึก">
        <span className="flex items-center">
          <Link to={`/app/notes/${note.id}/edit`} className="flex min-h-11 items-center px-3 text-[16px] font-medium">แก้ไข</Link>
          <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-label="เมนูบันทึก" className="flex size-11 items-center justify-center">
            <Icon name="dots" size={24} />
          </button>
        </span>
      </MobileBack>

      <div className="px-4 pb-4">
        <h1 className="font-display text-[26px] leading-[1.25] font-semibold tracking-[-0.4px]">{note.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-3">
          {noteCategoryLabel[note.category]}
          {project && (
            <>
              <span className={`size-2 rounded-full ${projectDot[project.color]}`} aria-hidden />
              <span className="text-ink-2">{project.name}</span>
            </>
          )}
        </p>
        {intro && intro.kind === 'text' && <p className="mt-4 text-[16px] leading-[1.55] whitespace-pre-wrap">{intro.text}</p>}
      </div>

      {blocks.map((b) => {
        if (b.kind === 'steps') {
          return (
            <ListGroup key={b.id} label="ขั้นตอน" count={b.steps.length}>
              {b.steps.map((s, i) => (
                <li key={i} className="flex gap-3 border-b border-rule-soft bg-sheet px-4 py-3.5">
                  <span className="w-5 shrink-0 font-mono text-[14px] text-ink-3">{i + 1}</span>
                  <span className="min-w-0 flex-1 text-[16px] leading-[1.45]">{s}</span>
                </li>
              ))}
            </ListGroup>
          )
        }
        if (b.kind === 'checklist') {
          return (
            <ListGroup key={b.id} label="รายการ" count={b.items.length}>
              {b.items.map((item) => (
                <li key={item.id} className="border-b border-rule-soft bg-sheet">
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4">
                    <input type="checkbox" checked={item.done} onChange={() => onTick(b.id, item.id)} className="size-[22px] shrink-0 accent-[var(--wc-brand-emerald)]" />
                    <span className={`min-w-0 flex-1 text-[16px] ${item.done ? 'text-ink-3 line-through' : ''}`}>{item.text}</span>
                  </label>
                </li>
              ))}
            </ListGroup>
          )
        }
        return null
      })}

      {(blocks.some((b) => b.kind === 'links' || b.kind === 'contacts')) && (
        <ListGroup
          label="ลิงก์และผู้ติดต่อ"
          count={blocks.reduce((n, b) => n + (b.kind === 'links' ? b.links.length : b.kind === 'contacts' ? b.contacts.length : 0), 0)}
        >
          {blocks.flatMap((b) =>
            b.kind === 'links'
              ? b.links.map((l) => (
                  <li key={l.id} className="border-b border-rule-soft bg-sheet">
                    <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                      <Icon name="link" size={20} className="text-ink-2" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] leading-[1.35] font-medium">{l.label}</span>
                        <span className="block truncate font-mono text-[13px] text-ink-3">{l.href}</span>
                      </span>
                    </a>
                  </li>
                ))
              : b.kind === 'contacts'
                ? b.contacts.map((c) => (
                    <li key={c.id} className="flex min-h-14 items-center gap-3 border-b border-rule-soft bg-sheet px-4 py-2.5">
                      <Icon name="phone" size={20} className="text-ink-2" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] leading-[1.35] font-medium">{c.name}</span>
                        <span className="block font-mono text-[13px] text-ink-3">{c.detail}</span>
                      </span>
                    </li>
                  ))
                : [],
          )}
        </ListGroup>
      )}

      {blocks.filter((b) => b.kind === 'file').map((b) =>
        b.kind === 'file' ? (
          <ListGroup key={b.id} label="ไฟล์แนบ" count={b.files.length}>
            {b.files.map((f) => (
              <li key={f.id} className="flex min-h-12 items-center gap-3 border-b border-rule-soft bg-sheet px-4">
                <Icon name="clip" size={20} className="text-ink-2" />
                <span className="min-w-0 flex-1 truncate text-[16px]">{f.name}</span>
                <span className="font-mono text-[13px] text-ink-3">{f.size}</span>
              </li>
            ))}
          </ListGroup>
        ) : null,
      )}

      {blocks.filter((b) => b.kind === 'credentials').map((b) =>
        b.kind === 'credentials' ? (
          <div key={b.id} className="mt-5 border-y border-rule bg-sheet px-4 py-4">
            <CredentialsBlock block={b} subject={note.title} />
          </div>
        ) : null,
      )}

      {linked.length > 0 && (
        <ListGroup label="งานที่ผูกไว้" count={linked.length}>
          {linked.map((t) => (
            <li key={t.id} className="border-b border-rule-soft bg-sheet">
              <Link to={`/app/tasks/${t.id}`} className="flex min-h-[64px] items-start gap-3 px-4 py-3">
                <span className={`w-[60px] shrink-0 pt-[3px] font-mono text-[13px] ${timeText[timeStateOf(t, now)]}`}>
                  {t.dueAt ? (timeStateOf(t, now) === 'late' ? gutterLabel(t, now).replace(/^เกิน /, '') : clock(t.dueAt)) : '–'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] leading-[1.35]">{t.title}</span>
                  <span className="block text-[13px] text-ink-3">{statusLabel[t.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ListGroup>
      )}

      {note.revisions.length > 0 && (
        <ListGroup label="ประวัติการแก้ไข" count={note.revisions.length}>
          {note.revisions.map((r) => (
            <li key={r.version} className="flex min-h-14 items-center gap-3 border-b border-rule-soft bg-sheet px-4 py-2">
              <span className="w-7 shrink-0 font-mono text-[13px] text-ink-3">v{r.version}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-[1.35]">{r.summary}</span>
                <span className="block text-[13px] text-ink-3">{sinceLabel(r.at, now)}{r.version === note.version && ' · เวอร์ชันปัจจุบัน'}</span>
              </span>
              {r.version !== note.version && r.blocks.length > 0 && (
                <button type="button" onClick={() => onRevert(r.version)} className="min-h-11 shrink-0 px-2 text-[14px] font-medium text-brand-strong">ย้อนกลับ</button>
              )}
            </li>
          ))}
        </ListGroup>
      )}
      <div className="h-6" />

      <BottomSheet open={menu} onClose={() => setMenu(false)} label="เมนูบันทึก">
        <SheetItem icon="pin" onClick={() => { setMenu(false); onPin() }}>{note.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}</SheetItem>
        <SheetItem icon="clock" onClick={() => { setMenu(false); setReview(true) }}>{note.reviewAt ? 'เปลี่ยนวันทบทวน' : 'ตั้งวันทบทวน'}</SheetItem>
        <SheetItem icon="trash" tone="late" onClick={() => { setMenu(false); onDelete() }}>ลบบันทึก</SheetItem>
      </BottomSheet>

      <BottomSheet
        open={review}
        onClose={() => setReview(false)}
        title="วันทบทวน"
        footer={note.reviewAt ? (
          <button type="button" onClick={() => { setReview(false); onReview('') }} className="wc-lift min-h-12 w-full rounded-control border border-rule bg-sheet text-[16px] font-medium">เอาออก</button>
        ) : undefined}
      >
        <div className="px-4 pb-3">
          <input
            type="date"
            aria-label="เลือกวันทบทวน"
            autoFocus
            defaultValue={note.reviewAt ? note.reviewAt.slice(0, 10) : ''}
            onChange={(e) => { if (e.target.value) { setReview(false); onReview(e.target.value) } }}
            className="h-12 w-full rounded-control border border-rule bg-sheet px-3 text-[16px]"
          />
        </div>
      </BottomSheet>
    </div>
  )
}
