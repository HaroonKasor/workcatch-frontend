import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CredentialsBlock } from '../components/Credentials'
import { Skeleton, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { useDeleteNote, useNote, useProjects, useRestoreNote, useRevertNote, useTasks, useUpdateNote } from '../lib/api'
import { toggleChecklistItem } from '../lib/notes'
import { fileAction, fileScan, fileStorageNote, noteCategoryLabel } from '../lib/style'
import { daysUntilLabel, fullDate, sinceLabel } from '../lib/time'
import type { Note, NoteBlock, Task } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/notes/:id — Figma node 135:1163, side panel 147:1267, file states 147:1333
 *
 * Read-only by design. A note you can edit by clicking into it is a note you
 * change by accident, and this screen's whole job is to be trusted while you
 * follow it — which is also why the checklist is the one thing that IS live:
 * ticking off a step you just did is reading, not editing, and it does not open
 * a new version.
 */
export default function NoteDetail() {
  const { id } = useParams()
  const { data: note, isPending, isError } = useNote(id)
  const projects = useProjects()
  const tasks = useTasks()
  const update = useUpdateNote()
  const revert = useRevertNote()
  const remove = useDeleteNote()
  const restore = useRestoreNote()
  const toast = useToast()
  const navigate = useNavigate()
  const now = useNow()
  const [confirming, setConfirming] = useState(false)
  const [pickingReview, setPickingReview] = useState(false)

  if (isPending) return <DetailSkeleton />
  if (isError || !note) return <p className="t-body text-error">ไม่พบบันทึกนี้</p>

  const project = (projects.data ?? []).find((p) => p.id === note.projectId)

  const body = note.blocks.filter((b) => ['heading', 'text', 'steps', 'checklist'].includes(b.kind))
  const links = note.blocks.filter((b) => b.kind === 'links')
  const contacts = note.blocks.filter((b) => b.kind === 'contacts')
  const files = note.blocks.filter((b) => b.kind === 'file')
  const credentials = note.blocks.filter((b) => b.kind === 'credentials')

  function tick(blockId: string, itemId: string) {
    if (!note) return
    // No summary: a tick is not a revision. See store.updateNote.
    update.mutate({ id: note.id, patch: { blocks: toggleChecklistItem(note.blocks, blockId, itemId) } })
  }

  function setReview(value: string) {
    if (!note) return
    update.mutate({ id: note.id, patch: { reviewAt: value ? new Date(value).toISOString() : null } })
    setPickingReview(false)
  }

  return (
    <>
      {/*
        Phone: a back bar with an overflow menu — Figma 235:1572. The desktop
        breadcrumb tells you where you are in a tree; on a phone there is no tree
        on screen, only the way back.
      */}
      <div className="sticky top-0 z-30 -mx-5 -mt-8 mb-4 flex items-center gap-2 border-b border-rule bg-ground/95 px-5 py-2 backdrop-blur-[2px] lg:hidden">
        <Link to="/app/notes" className="flex min-h-11 items-center pr-2 text-[13px] font-medium">
          ‹ บันทึก
        </Link>
        <div className="ml-auto">
          <MoreMenu
            reviewLabel={note.reviewAt ? 'เปลี่ยนวันทบทวน' : 'ตั้งวันทบทวน'}
            onReview={() => setPickingReview(true)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-eyebrow text-ink-3 hidden lg:block">
            <Link to="/app/notes" className="hover:text-ink-2">บันทึก</Link>
            {'  ›  '}
            {noteCategoryLabel[note.category]}
          </p>
          <h1 className="font-display text-[24px] leading-[1.24] font-semibold tracking-[-0.4px] lg:mt-1.5 lg:text-[32px] lg:tracking-[-0.6px]">
            {note.title}
          </h1>
          <p className="t-body text-ink-2 mt-2">
            {/* The phone has no breadcrumb, so the category rides in the meta
                line instead — Figma 235:1580. */}
            <span className="lg:hidden">{noteCategoryLabel[note.category]} · </span>
            แก้ล่าสุด {sinceLabel(note.updatedAt, now)} · เวอร์ชัน {note.version}
            {note.taskIds.length > 0 && ` · ผูกกับ ${note.taskIds.length} งาน`}
          </p>
          {note.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {note.tags.map((t) => (
                <li key={t} className="rounded-control border border-rule bg-sheet px-2.5 py-1 text-[12px] text-ink-2">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden flex-wrap gap-2 lg:flex">
          <Link
            to={`/app/notes/${note.id}/edit`}
            className="wc-lift flex min-h-11 items-center rounded-control bg-ink px-3.5 text-[13px] font-medium text-on-dark"
          >
            แก้ไข
          </Link>
          <Action
            pressed={note.pinned}
            onClick={() => update.mutate({ id: note.id, patch: { pinned: !note.pinned } })}
          >
            {note.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
          </Action>
          <Action pressed={pickingReview} onClick={() => setPickingReview((v) => !v)}>
            ตั้งวันทบทวน
          </Action>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="wc-lift min-h-11 rounded-control border border-error px-3.5 text-[13px] font-medium text-error"
          >
            ลบบันทึก
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0">
          {body.length > 0 ? (
            /* One sheet on a desktop column, a card per block on a phone —
               Figma 235:1588. At 350px the blocks need an edge between them; at
               744px the headings already provide it and extra borders would cut
               the note into pieces it is not really in. */
            <div className="space-y-3 lg:space-y-0 lg:rounded-sheet lg:border lg:border-rule lg:bg-sheet lg:px-7 lg:py-6.5">
              {body.map((b, i) => (
                <div
                  key={b.id}
                  className="rounded-sheet border border-rule bg-sheet px-4 py-3.5 lg:rounded-none lg:border-0 lg:p-0"
                >
                  <BodyBlock block={b} first={i === 0} onTick={tick} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-sheet border border-rule bg-sheet px-7 py-11">
              <p className="t-body text-ink-2">บันทึกนี้ยังไม่มีเนื้อหา · กด “แก้ไข” เพื่อเริ่มเขียน</p>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          {links.map((b) => (
            <Panel key={b.id} title={b.kind === 'links' ? (b.title ?? 'ลิงก์') : 'ลิงก์'}
              count={b.kind === 'links' ? `${b.links.length} รายการ` : ''}>
              {b.kind === 'links' && b.links.map((l, i) => (
                <Row key={l.id} label={l.label} sub={l.href} last={i === b.links.length - 1} />
              ))}
            </Panel>
          ))}

          {contacts.map((b) => (
            <Panel key={b.id} title={b.kind === 'contacts' ? (b.title ?? 'ผู้ติดต่อ') : 'ผู้ติดต่อ'}
              count={b.kind === 'contacts' ? `${b.contacts.length} คน` : ''}>
              {b.kind === 'contacts' && b.contacts.map((c, i) => (
                <Row key={c.id} label={c.name} sub={c.detail} last={i === b.contacts.length - 1} />
              ))}
            </Panel>
          ))}

          {files.map((b) => (
            <Panel key={b.id} title={b.kind === 'file' ? (b.title ?? 'ไฟล์แนบ') : 'ไฟล์แนบ'}
              count={b.kind === 'file' ? `${b.files.length} ไฟล์` : ''}>
              {b.kind === 'file' && b.files.map((f, i) => (
                <FileRow key={f.id} file={f} last={i === b.files.length - 1} />
              ))}
            </Panel>
          ))}

          {credentials.map((b) => (
            <div key={b.id} className="rounded-sheet border border-rule bg-sheet px-5 py-5">
              <CredentialsBlock block={b} subject={note.title} />
            </div>
          ))}

          <LinkedTasks note={note} tasks={tasks.data ?? []} />

          {/* FR-KN-14 — Figma 147:1311 */}
          <section>
            <h2 className="t-section">เตือนให้ทบทวนบันทึก</h2>
            <div className="mt-3.5 rounded-sheet border border-rule bg-sheet px-5 py-4">
              {note.reviewAt ? (
                <>
                  <p className="text-[14px] font-medium">{fullDate(note.reviewAt)}</p>
                  <p className="t-body text-ink-2 mt-1.5">
                    {daysUntilLabel(note.reviewAt, now)} · เตือนผ่าน LINE ตามช่องทางที่เปิดไว้ในหน้าตั้งค่า
                  </p>
                </>
              ) : (
                <p className="t-body text-ink-2">ยังไม่ได้ตั้งวันทบทวน จึงจะไม่มีการเตือนใดๆ</p>
              )}

              {pickingReview && (
                <label className="mt-3.5 block">
                  <span className="t-meta text-ink-3">เลือกวันทบทวน</span>
                  <input
                    type="date"
                    autoFocus
                    defaultValue={note.reviewAt ? note.reviewAt.slice(0, 10) : ''}
                    onChange={(e) => setReview(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[13px]"
                  />
                </label>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickingReview((v) => !v)}
                  className="wc-lift min-h-11 flex-1 rounded-control border border-rule text-[12.5px] font-medium"
                >
                  {note.reviewAt ? 'เปลี่ยนวัน' : 'ตั้งวันทบทวน'}
                </button>
                {note.reviewAt && (
                  <button
                    type="button"
                    onClick={() => setReview('')}
                    className="wc-lift min-h-11 flex-1 rounded-control border border-rule text-[12.5px] font-medium"
                  >
                    เอาออก
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* FR-KN-13 — Figma 147:1271 */}
          <section>
            <h2 className="t-section">ประวัติการแก้ไข</h2>
            <p className="t-body text-ink-2 mt-1.5">เก็บเฉพาะเนื้อหาทั่วไป ไม่เก็บค่าที่ซ่อนไว้</p>
            <div className="mt-3.5 rounded-sheet border border-rule bg-sheet px-5">
              {note.revisions.map((r, i) => (
                <div
                  key={r.version}
                  className={`flex items-start gap-3 py-3.5 ${i === note.revisions.length - 1 ? '' : 'border-b border-rule-soft'}`}
                >
                  <span className="w-6 shrink-0 font-mono text-[12px] leading-[1.45] text-ink-3">
                    v{r.version}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-[1.4]">{r.summary}</p>
                    <p className="t-caption mt-1 text-ink-3">
                      {sinceLabel(r.at, now)}
                      {r.version === note.version && ' · เวอร์ชันปัจจุบัน'}
                    </p>
                  </div>
                  {r.version !== note.version && (
                    <button
                      type="button"
                      disabled={r.blocks.length === 0}
                      title={r.blocks.length === 0 ? 'เวอร์ชันนี้ไม่มีเนื้อหาที่เก็บไว้' : undefined}
                      onClick={() => {
                        revert.mutate({ id: note.id, version: r.version })
                        toast({ title: `ย้อนกลับไปเวอร์ชัน ${r.version} แล้ว`, body: 'บันทึกเป็นเวอร์ชันใหม่ ประวัติเดิมยังอยู่ครบ' })
                      }}
                      className="wc-lift min-h-11 shrink-0 rounded-control border border-rule px-2.5 text-[12px] font-medium text-ink-2 disabled:opacity-40"
                    >
                      ย้อนกลับ
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {project && (
            <p className="t-meta text-ink-3 leading-relaxed">
              บันทึกนี้อยู่ในโปรเจกต์ {project.name} · ลบงานที่ผูกไว้แล้วบันทึกไม่หายไปด้วย
            </p>
          )}
        </aside>
      </div>

      {/*
        Phone action bar — Figma 235:1633. It sits above the tab bar rather than
        replacing it: the frame drops global navigation on this screen, but a
        detail view whose only way out is one back link is a dead end if you
        arrived from a link rather than from the list.
      */}
      <div
        className="sticky bottom-[62px] z-30 -mx-5 mt-8 flex gap-2 border-t border-rule bg-sheet px-5 py-3 lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <Link
          to={`/app/notes/${note.id}/edit`}
          className="wc-lift flex min-h-11 flex-1 items-center justify-center rounded-control bg-ink text-[13px] font-medium text-on-dark"
        >
          แก้ไข
        </Link>
        <button
          type="button"
          aria-pressed={note.pinned}
          onClick={() => update.mutate({ id: note.id, patch: { pinned: !note.pinned } })}
          className={`wc-lift min-h-11 rounded-control border px-3.5 text-[13px] font-medium ${
            note.pinned ? 'border-ink bg-selected text-ink' : 'border-rule text-ink-2'
          }`}
        >
          {note.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="wc-lift min-h-11 rounded-control border border-error px-3.5 text-[13px] font-medium text-error"
        >
          ลบ
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="ลบบันทึกนี้"
        subject={note.title}
        body="ย้ายไปถังลบ กู้คืนได้ภายใน 30 วัน"
        consequences={[
          note.taskIds.length > 0
            ? `งานที่ผูกไว้ ${note.taskIds.length} งานถูกยกเลิกการเชื่อม แต่ไม่ถูกลบ`
            : 'งานที่ผูกไว้ถูกยกเลิกการเชื่อม แต่ไม่ถูกลบ',
          // True as written: store.deleteNote drops the values out of the vault
          // now, so undo brings the note back without them.
          'ค่าที่ซ่อนไว้ถูกลบถาวรทันที และกู้คืนไม่ได้',
        ]}
        confirmLabel="ลบบันทึก"
        cancelLabel="เก็บไว้"
        destructive
        onConfirm={() => {
          const snapshot: Note = note
          remove.mutate(note.id)
          toast({
            title: 'ลบบันทึกแล้ว',
            body: 'อยู่ในถังลบ กู้คืนได้ภายใน 30 วัน · ค่าที่ซ่อนไว้กู้คืนไม่ได้',
            action: { label: 'เลิกทำ', onAct: () => restore.mutate(snapshot) },
          })
          void navigate('/app/notes')
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

function Action({ pressed, onClick, children }: {
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`wc-lift min-h-11 rounded-control border px-3.5 text-[13px] font-medium ${
        pressed ? 'border-ink bg-selected text-ink' : 'border-rule text-ink-2'
      }`}
    >
      {children}
    </button>
  )
}

/** heading / text / steps / checklist, in the order the author put them. */
function BodyBlock({ block, first, onTick }: {
  block: NoteBlock
  first: boolean
  onTick: (blockId: string, itemId: string) => void
}) {
  if (block.kind === 'heading') {
    return <h2 className={`t-section ${first ? '' : 'mt-6'}`}>{block.text}</h2>
  }

  if (block.kind === 'text') {
    return (
      <p className={`text-[13.5px] leading-[1.55] text-ink-2 ${first ? '' : 'mt-2.5'}`}>
        {block.text}
      </p>
    )
  }

  if (block.kind === 'steps') {
    return (
      <ol className={first ? '' : 'mt-3'}>
        {block.steps.map((s, i) => (
          <li key={i} className={`flex gap-3.5 ${i > 0 ? 'mt-3' : ''}`}>
            <span className="w-[18px] shrink-0 font-mono text-[12px] leading-[1.45] font-medium text-ink-3">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55]">{s}</span>
          </li>
        ))}
      </ol>
    )
  }

  if (block.kind === 'checklist') {
    return (
      <ul className={first ? '' : 'mt-3'}>
        {block.items.map((item, i) => (
          <li key={item.id} className={i > 0 ? 'mt-1' : ''}>
            {/* The whole row is the control, so the target clears 44px on a phone
                without the checkbox itself having to be huge. */}
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onTick(block.id, item.id)}
                className="size-[15px] shrink-0 accent-[var(--wc-brand-emerald)]"
              />
              <span
                className={`min-w-0 flex-1 text-[13.5px] leading-[1.55] ${item.done ? 'text-ink-3' : ''}`}
              >
                {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
    )
  }

  return null
}

/** How a task reads on this screen: its state, not its deadline. */
function taskState(status: Task['status']): string {
  if (status === 'DONE') return 'เสร็จแล้ว'
  if (status === 'CANCELLED') return 'ยกเลิกแล้ว'
  if (status === 'WAITING') return 'รอคนอื่น'
  return 'ยังเปิดอยู่'
}

/**
 * "งานที่ผูกไว้" — Figma 135:1163 (the panel) and 144:8 (the same relationship
 * seen from the task).
 *
 * The frame draws the rows and the count. What it never drew, and what did not
 * exist anywhere in the product, is the way to MAKE one: `taskIds` was written
 * by the seed fixtures and by nothing else, while the save toast said
 * "ผูกกับงานได้จากหน้ารายละเอียด" and the editor sidebar said "ผูกกับงานได้หลายงาน".
 * Two sentences describing a control that was not there.
 *
 * Many per note, and unlinking is not deleting: the note keeps its content, the
 * task keeps existing. That is the whole reason the relationship is an array of
 * ids rather than a field on either side — see the note on `taskIds` in types.
 *
 * The panel now renders even when nothing is linked, because an empty panel with
 * a button is what tells you the linking exists at all.
 */
function LinkedTasks({ note, tasks }: { note: Note; tasks: Task[] }) {
  const update = useUpdateNote()
  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')

  const linked = tasks.filter((t) => note.taskIds.includes(t.id))
  const query = q.trim().toLowerCase()
  const candidates = tasks
    .filter((t) => !note.taskIds.includes(t.id))
    .filter((t) => query === '' || t.title.toLowerCase().includes(query))

  /**
   * No `summary`, so linking does not open a new version — the same rule ticking
   * a checklist item follows. A version history that fills up with "ผูกกับงาน"
   * stops being a record of what the note SAID, which is what it is for.
   */
  function commit(taskIds: string[], done: { title: string; body: string }) {
    const before = note.taskIds
    update.mutate({ id: note.id, patch: { taskIds } })
    toast({
      ...done,
      action: {
        label: 'เลิกทำ',
        onAct: () => update.mutate({ id: note.id, patch: { taskIds: before } }),
      },
    })
  }

  function link(task: Task) {
    setQ('')
    commit([...note.taskIds, task.id], { title: 'ผูกกับงานแล้ว', body: task.title })
  }

  function unlink(task: Task) {
    commit(note.taskIds.filter((id) => id !== task.id), {
      title: 'ยกเลิกการเชื่อมแล้ว',
      body: `${task.title} · งานยังอยู่ครบ ไม่ได้ถูกลบ`,
    })
  }

  return (
    <section>
      <header className="flex items-center justify-between gap-2">
        <h2 className="t-section">งานที่ผูกไว้</h2>
        <p className="t-caption text-ink-3">{linked.length} งาน</p>
      </header>

      <div className="mt-3.5 rounded-sheet border border-rule bg-sheet px-5">
        {linked.length === 0 ? (
          <p className="t-body text-ink-2 py-3.5 leading-relaxed">
            ยังไม่ได้ผูกกับงานใด · บันทึกหนึ่งอันผูกกับงานได้หลายงาน ลบงานแล้วบันทึกไม่หายไปด้วย
          </p>
        ) : (
          linked.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-rule-soft py-3.5">
              {/* The title is the link and the button is its sibling. A button
                  inside a link is invalid, and this row has always had to hold
                  both. */}
              <Link to={`/app/tasks/${t.id}`} className="min-w-0 flex-1 rounded-sheet hover:text-ink">
                <p className="text-[13px] leading-[1.45]">{t.title}</p>
                <p className="t-caption mt-[3px] text-ink-3">{taskState(t.status)}</p>
              </Link>
              <button
                type="button"
                onClick={() => unlink(t)}
                className="wc-lift min-h-11 shrink-0 rounded-control border border-rule px-2.5 text-[12px] font-medium text-ink-2"
              >
                เอาออก<span className="sr-only"> {t.title}</span>
              </button>
            </div>
          ))
        )}

        <div className="py-3.5">
          <button
            type="button"
            aria-expanded={picking}
            onClick={() => { setPicking((v) => !v); setQ('') }}
            className="wc-lift min-h-11 w-full rounded-control border border-rule bg-ground text-[12.5px] font-medium"
          >
            {picking ? 'ปิดรายการงาน' : '+ ผูกกับงาน'}
          </button>

          {picking && (
            <div className="mt-3">
              <label className="block">
                <span className="sr-only">ค้นหางานที่จะผูก</span>
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหาชื่องาน"
                  className="h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[12.5px] placeholder:text-ink-3"
                />
              </label>

              {candidates.length === 0 ? (
                <p className="t-body text-ink-2 mt-3">
                  {tasks.length === note.taskIds.length
                    ? 'ผูกครบทุกงานแล้ว'
                    : 'ไม่พบงานที่ตรงกับคำค้น'}
                </p>
              ) : (
                /* Capped and scrollable rather than paged: the list is a picker,
                   and a picker that pushes the rest of the page down is one you
                   have to scroll back up from every time. */
                <ul className="mt-2 max-h-[264px] overflow-y-auto overscroll-contain">
                  {candidates.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => link(t)}
                        className="wc-lift flex min-h-11 w-full flex-col justify-center rounded-control border-b border-rule-soft px-2 py-2 text-left"
                      >
                        <span className="text-[12.5px] leading-[1.45]">{t.title}</span>
                        <span className="t-caption mt-[2px] text-ink-3">
                          {taskState(t.status)}
                          {t.project && ` · ${t.project.name}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Panel({ title, count, children }: {
  title: string
  count?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="flex items-center justify-between gap-2">
        <h2 className="t-section">{title}</h2>
        {count && <p className="t-caption text-ink-3">{count}</p>}
      </header>
      <div className="mt-3.5 rounded-sheet border border-rule bg-sheet px-5">{children}</div>
    </section>
  )
}

function Row({ label, sub, last, to }: {
  label: string
  sub: string
  last: boolean
  to?: string
}) {
  const inner = (
    <>
      <p className="text-[13px] leading-[1.45]">{label}</p>
      <p className="t-caption mt-[3px] text-ink-3">{sub}</p>
    </>
  )
  return (
    <div className={`py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      {to ? <Link to={to} className="block rounded-sheet hover:text-ink">{inner}</Link> : inner}
    </div>
  )
}

/**
 * BR-KN-04. A file is downloadable only once the server reports a clean scan;
 * every other verdict shows why and offers the action that matches it, rather
 * than a download button that fails.
 */
function FileRow({ file, last }: {
  file: Extract<NoteBlock, { kind: 'file' }>['files'][number]
  last: boolean
}) {
  const scan = fileScan[file.scan]
  return (
    <div className={`flex items-center gap-3 py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] leading-[1.45] break-all">{file.name}</p>
          <span className={`shrink-0 rounded-[3px] px-2 py-[2px] font-mono text-[12px] tracking-[1.1px] ${scan.tone}`}>
            {scan.badge}
          </span>
        </div>
        <p className="t-caption mt-[3px] text-ink-3">
          {file.size} · {file.scan === 'CLEAN' ? fileStorageNote : scan.note}
        </p>
      </div>
      {/* Disabled for every verdict, CLEAN included — see `fileStorageNote`.
          The label still says what it would do, and the caption beside it says
          why it cannot. */}
      <button
        type="button"
        disabled
        title={file.scan === 'CLEAN' ? fileStorageNote : scan.note}
        className="wc-lift min-h-11 shrink-0 rounded-control border border-rule px-2.5 text-[12px] font-medium text-ink-2 disabled:opacity-45"
      >
        {fileAction[file.scan]}
      </button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดบันทึก">
      <SkeletonPageHeader />
      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="rounded-sheet border border-rule bg-sheet px-7 py-6.5">
          <Skeleton w="140px" h="20px" />
          <Skeleton w="100%" h="13px" className="mt-4" />
          <Skeleton w="88%" h="13px" className="mt-2.5" />
          <Skeleton w="120px" h="20px" className="mt-7" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} w={`${92 - i * 12}%`} h="13px" className="mt-3.5" />
          ))}
        </div>
        <div className="space-y-8">
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton w="90px" h="20px" />
              <div className="mt-3.5 rounded-sheet border border-rule bg-sheet px-5 py-3.5">
                <Skeleton w="80%" h="13px" />
                <Skeleton w="55%" h="10px" className="mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  )
}

/**
 * The phone's overflow — Figma 235:1570.
 *
 * It holds the one action that did not fit the bottom bar. The bar carries what
 * you came to do; setting a review date is a once-a-quarter thought and belongs
 * behind the extra tap rather than taking a third of the width.
 */
function MoreMenu({ reviewLabel, onReview }: { reviewLabel: string; onReview: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="ตัวเลือกอื่นสำหรับบันทึกนี้"
        aria-haspopup="menu"
        aria-expanded={open}
        className="wc-lift grid size-11 place-items-center rounded-control text-[17px] leading-none text-ink-2"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-[184px] overflow-hidden rounded-control border border-rule bg-sheet shadow-[0_2px_4px_rgba(23,23,23,0.06),0_16px_40px_rgba(23,23,23,0.16)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onReview() }}
            className="flex min-h-11 w-full items-center px-3.5 text-left text-[12.5px] text-ink-2"
          >
            {reviewLabel}
          </button>
        </div>
      )}
    </div>
  )
}
