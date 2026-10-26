import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useCreateChecklistItem, useDeleteTask, useNotes, useProjects, useRestoreTask, useTask, useUpdateChecklistItem,
  useUpdateTask, type TaskPatch,
} from '../lib/api'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { InlineSelect, InlineText } from '../components/InlineEdit'
import { Skeleton as Block, SkeletonScreen } from '../components/Skeleton'
import { clock, fromLocalInput, gutterLabel, localInput, longDate, remaining, stamp, timeStateOf } from '../lib/time'
import {
  noteCategoryLabel, notificationLabel, notificationTone,
  priorityLabel, projectDot, statusLabel, timeText,
} from '../lib/style'
import { subtaskProgress } from '../lib/tasks'
import { useNow } from '../lib/useNow'
import type { Priority, Subtask, Task, TaskReminder, TaskStatus } from '../lib/types'
import { SourceMessage } from '../components/SourceMessage'
import { LinksAndFiles } from '../components/TaskLinks'
import { linkify, LINK_REL } from '../lib/links'
import { useAiPanel } from '../lib/aiPanel'
import { BottomSheet, SheetItem } from '../components/mobile/BottomSheet'
import { Icon } from '../components/mobile/Icon'
import { PostponeSheet } from '../components/mobile/PostponeSheet'

const STATUSES: TaskStatus[] = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE', 'CANCELLED']
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

/**
 * /app/tasks/:id — Figma v2 423:796 (desktop), 423:3344 (phone); v1 37:389, 63:1089, 282:2 (editing).
 *
 * The hero fact of this screen is the deadline, not a status badge. Every other
 * task app leads with status; this one leads with how much time is left, because
 * that is the thing that decides whether you act now.
 *
 * Below it the screen answers the three questions a task raises after "when":
 * what is left to do (รายการย่อย), what is attached (ไฟล์แนบ), and what the
 * system has already said about it (การเตือน). The last two are where this
 * product can quietly lie, so both are written to refuse rather than pretend: a
 * file is not downloadable until the SERVER reports a clean scan, and a
 * reminder marked ส่งแล้ว means LINE accepted the request, not that anyone read it.
 *
 * Everything a person owns on this page is editable in place — Figma 282:2. A
 * task is written down while somebody is still talking, so it arrives without a
 * deadline and without a requester; the screen that shows it is therefore also
 * the screen that fixes it, with no edit mode in between. What is NOT editable
 * is equally deliberate: ที่มา and สร้างเมื่อ are the server's facts, and
 * TaskUpdateRequest refuses them even if you post them by hand, so drawing a
 * control there would be a promise the API breaks.
 */
export default function TaskDetail() {
  const { id } = useParams()
  const { data: task, isPending, isError } = useTask(id)
  const { data: projects } = useProjects()
  const notes = useNotes()
  const now = useNow()
  const update = useUpdateTask()
  const createChecklistItem = useCreateChecklistItem()
  const updateChecklistItem = useUpdateChecklistItem()
  const remove = useDeleteTask()
  const restore = useRestoreTask()
  const navigate = useNavigate()
  const toast = useToast()
  const [pickingStatus, setPickingStatus] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [projectSheet, setProjectSheet] = useState(false)
  const [postponing, setPostponing] = useState(false)
  const ai = useAiPanel()

  if (isPending) return <TaskDetailSkeleton />
  if (isError || !task) return <p className="t-body text-error">ไม่พบงานนี้</p>

  const state = timeStateOf(task, now)
  const subtasks = subtaskProgress(task.subtasks)
  const files = task.attachments ?? []
  const reminders = task.reminders ?? []
  const linkedNotes = (notes.data ?? []).filter((n) => n.taskIds.includes(task.id))
  // "ยังไม่ส่ง" is anything the delivery machine has not finished with. CANCELLED
  // and FAILED_FINAL are done being tried, so cancelling them is not a thing
  // that "will happen" and the dialog must not claim it.
  const unsent = reminders.filter(
    (r) => r.status === 'PENDING' || r.status === 'PROCESSING' || r.status === 'FAILED_RETRYABLE',
  ).length

  /**
   * One committed edit.
   *
   * The write is optimistic — useUpdateTask paints the cache before the request
   * leaves — so a save that fails has to put the old value back AND say so. A
   * silent revert is the worst of the three possible outcomes: the reader
   * watched their edit land and now has no reason to ever look at it again.
   *
   * `undo` is the patch that puts it back, and it is null wherever the API
   * cannot express the old value: TaskUpdateRequest reads null as "leave alone",
   * so a deadline or a project that was previously EMPTY cannot be emptied
   * again. An "เลิกทำ" that silently does nothing is worse than no button.
   */
  function save(label: string, patch: TaskPatch, undo: TaskPatch | null, body?: string) {
    if (!task) return
    const taskId = task.id
    update.mutate(
      { id: taskId, patch },
      {
        onSuccess: () =>
          toast({
            title: `แก้ไข${label}แล้ว`,
            body,
            action: undo
              ? { label: 'เลิกทำ', onAct: () => update.mutate({ id: taskId, patch: undo }) }
              : undefined,
          }),
        onError: (err) =>
          toast({
            tone: 'error',
            // Figma 84:53. The title says the save failed; the body says which
            // field went back to what it was, so the revert is never a surprise.
            title: 'บันทึกงานนี้ไม่สำเร็จ',
            body: `${label}กลับไปเป็นค่าเดิมแล้ว · ${err.message}`,
          }),
      },
    )
  }

  /**
   * Both routes to a new status — the ปิดงานนี้ button and the picker below it.
   *
   * One function on purpose. The picker used to change the status in silence
   * while the button beside it offered เลิกทำ, which is the wrong way round: the
   * picker lists all seven states, so it is the control people misfire on, and
   * it was the one with no way back.
   */
  function setStatus(next: TaskStatus, title: string, body?: string) {
    if (!task) return
    const taskId = task.id
    const was = task.status
    if (next === was) return
    update.mutate({ id: taskId, patch: { status: next } })
    toast({
      title,
      body,
      action: { label: 'เลิกทำ', onAct: () => update.mutate({ id: taskId, patch: { status: was } }) },
    })
  }

  // Ticking a subtask is reading, not editing: it records what you just did and
  // does not touch the task's status, its deadline or its reminders.
  function tick(subtaskId: string) {
    if (!task?.subtasks) return
    const item = task.subtasks.find((row) => row.id === subtaskId)
    if (item) updateChecklistItem.mutate({ taskId: task.id, id: item.id, patch: { done: !item.done } })
  }

  const done = task.status === 'DONE'
  const closedTitle = unsent > 0 ? `ปิดงานแล้ว · ยกเลิกการเตือน ${unsent} รายการ` : 'ปิดงานแล้ว'
  const dueLead = (() => {
    if (done && task.completedAt) return `ปิดงานแล้ว ${clock(task.completedAt)}`
    const g = gutterLabel(task, now)
    return /^\d\d:\d\d$/.test(g) ? `วันนี้ ${g}` : g
  })()
  const dueRest = (() => {
    if (!task.dueAt) return ''
    if (done && task.completedAt) {
      const early = Math.round((Date.parse(task.dueAt) - Date.parse(task.completedAt)) / 60_000)
      if (early <= 0) return ''
      return `ก่อนกำหนด ${Math.floor(early / 60)} ชม. ${early % 60} นาที`
    }
    return state === 'late' ? '' : remaining(task.dueAt, now)
  })()

  return (
    <>
      {/* Phone: the back link and the ··· menu, Figma 460:280. */}
      <div className="flex items-center justify-between pl-2 pr-1 pt-[max(8px,env(safe-area-inset-top))] lg:hidden">
        <Link to="/app/tasks" className="flex min-h-11 items-center gap-1 px-1 text-[17px]">
          <Icon name="chevronLeft" size={22} />งาน
        </Link>
        <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-label="เมนูงานนี้" className="flex size-11 items-center justify-center">
          <Icon name="dots" size={24} />
        </button>
      </div>
      <p className="t-caption hidden text-ink-3 lg:block">
        <Link to="/app/tasks" className="hover:text-ink-2">รายการงาน</Link>
        {task.project && <> {'  ›  '} {task.project.name}</>}
      </p>
      {/* Figma 37:469 draws the title 744 wide — the left column, not the whole
          page. At rest that is invisible; the moment the field takes its wash it
          is the difference between a highlighted line and a highlighted band. */}
      <h1 className="mt-1.5 max-lg:mt-1 max-lg:px-4 xl:max-w-[744px]">
        <InlineText
          label="ชื่องาน"
          value={task.title}
          textClass="font-display text-[24px] lg:text-[32px] font-semibold leading-[1.3] tracking-[-0.6px]"
          required
          requiredMessage="ใส่ชื่องานก่อน"
          maxLength={255}
          onCommit={(next) => save('ชื่องาน', { title: next }, { title: task.title }, next)}
        />
      </h1>

      {task.dueAt ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3 max-lg:hidden">
            <span className={`h-[26px] w-[3px] ${state === 'late' ? 'bg-time-late' : 'bg-time-today'}`} aria-hidden />
            <span className={`font-mono text-[15px] font-semibold ${timeText[state]}`}>
              {state === 'late' ? 'เลยกำหนดแล้ว' : `ครบกำหนด ${clock(task.dueAt)}`}
            </span>
            <span className="t-body text-ink-2">{state === 'late' ? '' : remaining(task.dueAt, now)}</span>
          </div>
          <div className="mt-3 flex items-center gap-3 px-4 lg:hidden">
            <span className={`h-[26px] w-[3px] shrink-0 ${done ? 'bg-brand' : state === 'late' ? 'bg-time-late' : 'bg-time-today'}`} aria-hidden />
            <span className={`font-mono text-[16px] font-semibold ${done ? 'text-brand-strong' : timeText[state]}`}>{dueLead}</span>
            {dueRest && <span className="text-[14px] text-ink-3">{dueRest}</span>}
          </div>
        </>
      ) : (
        <p className="t-body text-ink-2 mt-4 max-lg:px-4">ยังไม่มีกำหนดส่ง</p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_344px] max-lg:mt-4 max-lg:flex max-lg:flex-col max-lg:gap-0">
        <div className="min-w-0 max-lg:contents">
          {/* v2 423:796: the description sits on the page, not in a sheet — it
              is the task's prose, and a box made it read like a form field. */}
          <Section title="รายละเอียด" bare className="max-lg:order-1 max-lg:px-4 max-lg:pb-5">
            <div className="py-1">
              <DescriptionField
                value={task.description ?? ''}
                onCommit={(next) =>
                  save('รายละเอียด', { description: next }, { description: task.description ?? '' })
                }
              />
              {/* Beside the description, never inside it: the owner's notes are
                  editable and kept; the message the draft came from is neither. */}
              {task.sourceMessage && <SourceMessage task={task} />}
            </div>
          </Section>

          <Section
            title="รายการย่อย"
            note={subtasks.total > 0 ? `${subtasks.done}/${subtasks.total}` : undefined}
            className="mt-8 max-lg:mt-0 max-lg:order-2"
          >
            {(task.subtasks ?? []).length === 0 && (
              <Empty>ยังไม่มีรายการย่อย</Empty>
            )}
            {(task.subtasks ?? []).map((item) => (
              <SubtaskRow
                key={item.id}
                item={item}
                onTick={() => tick(item.id)}
                onRename={(next) => {
                  updateChecklistItem.mutate({ taskId: task.id, id: item.id, patch: { label: next } })
                }}
              />
            ))}
            {/* Figma 37:494. The add row is drawn as one more subtask line, so
                the list grows where you are already looking rather than under a
                button somewhere else. */}
            <div className="flex items-center gap-1 px-4 lg:px-5">
              <span className="w-11 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <InlineText
                  label="รายการย่อย"
                  value=""
                  placeholder="เพิ่มรายการย่อย"
                  required
                  srSuffix=""
                  textClass="text-[13px] leading-[1.5] max-lg:text-[16px]"
                  onCommit={(next) => {
                    createChecklistItem.mutate({ taskId: task.id, label: next })
                  }}
                />
              </div>
            </div>
          </Section>

          <div className="max-lg:order-4">
            <LinksAndFiles task={task} />
          </div>

          <Section title="ประวัติการเปลี่ยนแปลง" className="mt-8 max-lg:mt-0 max-lg:order-7">
            <Row when={`สร้างเมื่อ ${longDate(new Date(task.createdAt))}`} what={`จาก ${task.source ?? 'เว็บ'}`} last={!task.completedAt} />
            {task.completedAt && (
              <Row when={`ปิดงาน ${clock(task.completedAt)}`} what="เปลี่ยนสถานะเป็น เสร็จ" last />
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-8 max-lg:contents">
          <div className="space-y-2.5 max-lg:hidden">
            {/* Closing a task is reversible from the same button, because the
                most common correction is realising you closed the wrong one. */}
            {/* min-h-11, not py-3 alone: 13px type in a 12px pad lands on 43.5,
                which is under the 44 a thumb needs and under what this project's
                own a11y specs enforce on every other primary control. */}
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => {
                const closing = task.status !== 'DONE'
                setStatus(
                  closing ? 'DONE' : 'IN_PROGRESS',
                  closing ? closedTitle : 'เปิดงานอีกครั้งแล้ว',
                )
              }}
              className={`wc-lift min-h-11 w-full rounded-control py-3 text-[13px] font-medium text-on-dark disabled:opacity-55 ${
                task.status === 'DONE' ? 'bg-ink' : 'bg-brand'
              }`}
            >
              {task.status === 'DONE' ? 'เปิดงานนี้อีกครั้ง' : 'ปิดงานนี้'}
            </button>
            <button
              type="button"
              onClick={() => setPickingStatus((v) => !v)}
              aria-expanded={pickingStatus}
              className="wc-lift min-h-11 w-full rounded-control border border-rule bg-sheet py-3 text-[13px] font-medium"
            >
              เปลี่ยนสถานะ
            </button>
            {pickingStatus && (
              <div className="rounded-sheet border border-rule bg-sheet p-1.5">
                {STATUSES.map((sKey) => (
                  <button
                    key={sKey}
                    type="button"
                    aria-pressed={task.status === sKey}
                    onClick={() => {
                      setStatus(sKey, `เปลี่ยนสถานะเป็น ${statusLabel[sKey]} แล้ว`)
                      setPickingStatus(false)
                    }}
                    className={`flex min-h-11 w-full items-center rounded-control px-3 py-2 text-left text-[12.5px] hover:bg-ink/[0.04] ${
                      task.status === sKey ? 'font-medium' : 'text-ink-2'
                    }`}
                  >
                    {statusLabel[sKey]}
                  </button>
                ))}
              </div>
            )}
            {/* Figma 82:93 ("Dialog/ลบงาน"). Deleting is the one action on this
                screen undo cannot be trusted to cover on its own, so it is the
                one action that asks first — and it asks by stating what happens,
                not by asking whether you are sure. Drawn quietly, under the two
                actions people actually came for. */}
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="wc-lift min-h-11 w-full rounded-control border border-error bg-sheet py-3 text-[13px] font-medium text-error"
            >
              ลบงานนี้
            </button>
          </div>

          {/* Figma 282:26. Six rows became controls; the last two did not, and
              the gap between them is the whole point of the panel. */}
          <Section title="ข้อมูลงาน" className="max-lg:order-3">
            <PropRow k="สถานะ">
              <InlineSelect
                label="สถานะ"
                value={task.status}
                options={STATUSES.map((s) => ({ value: s, label: statusLabel[s] }))}
                onCommit={(next) =>
                  save('สถานะ', { status: next as TaskStatus }, { status: task.status }, statusLabel[next])
                }
              />
            </PropRow>
            <PropRow k="ความสำคัญ">
              <InlineSelect
                label="ความสำคัญ"
                value={task.priority}
                options={PRIORITIES.map((p) => ({ value: p, label: priorityLabel[p] }))}
                onCommit={(next) =>
                  save(
                    'ความสำคัญ',
                    { priority: next as Priority },
                    { priority: task.priority },
                    priorityLabel[next as Priority],
                  )
                }
              />
            </PropRow>
            <PropRow k="กำหนดส่ง">
              <InlineText
                label="กำหนดส่ง"
                align="right"
                mark={false}
                type="datetime-local"
                required
                value={task.dueAt ? localInput(task.dueAt) : ''}
                display={task.dueAt ? stamp(task.dueAt) : ''}
                onCommit={(next) => {
                  const iso = fromLocalInput(next)
                  if (!iso) return
                  // Null means "leave alone" to the API, so a deadline that was
                  // never set cannot be un-set — no undo rather than a dead one.
                  save('กำหนดส่ง', { dueAt: iso }, task.dueAt ? { dueAt: task.dueAt } : null, stamp(iso))
                }}
              />
            </PropRow>
            <PropRow k="โปรเจกต์">
              <InlineSelect
                label="โปรเจกต์"
                value={task.project?.id ?? ''}
                dot={task.project ? projectDot[task.project.color] : undefined}
                options={[
                  ...(task.project ? [] : [{ value: '', label: '—' }]),
                  ...(projects ?? [])
                    .filter((p) => !p.archivedAt || p.id === task.project?.id)
                    .map((p) => ({ value: p.id, label: p.name })),
                ]}
                onCommit={(next) => {
                  if (!next) return
                  const was = task.project
                  save(
                    'โปรเจกต์',
                    { projectId: next },
                    was ? { projectId: was.id } : null,
                    (projects ?? []).find((p) => p.id === next)?.name,
                  )
                }}
              />
            </PropRow>
            <PropRow k="รอ">
              <InlineText
                label="รอ"
                align="right"
                mark={false}
                value={task.waitingFor ?? ''}
                onCommit={(next) => save('รอ', { waitingFor: next }, { waitingFor: task.waitingFor ?? '' }, next)}
              />
            </PropRow>
            <PropRow k="ผู้สั่ง">
              <InlineText
                label="ผู้สั่ง"
                align="right"
                mark={false}
                maxLength={120}
                value={task.requester ?? ''}
                onCommit={(next) => save('ผู้สั่ง', { requester: next }, { requester: task.requester ?? '' }, next)}
              />
            </PropRow>
            {/* Figma 282:70: the server decides these, and TaskUpdateRequest
                does not accept them at all. No box, no wash, no "แก้" — saying
                so up front beats drawing a control and refusing it later. */}
            <Fact k="ที่มา" v={task.source ?? 'เว็บ'} />
            <Fact k="สร้างเมื่อ" v={stamp(task.createdAt)} last />
          </Section>

          <Section title="การเตือน" className="max-lg:order-5">
            {!task.dueAt ? (
              <Empty>ยังไม่มีการเตือน</Empty>
            ) : reminders.length === 0 ? (
              <Empty>ยังไม่มีการเตือน</Empty>
            ) : (
              reminders
                .slice()
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((r, i, arr) => (
                  <ReminderRow key={r.id} reminder={r} now={now} last={i === arr.length - 1} />
                ))
            )}
          </Section>

          {/* บันทึกที่เกี่ยวข้อง — v2 423:796. The notes this task is linked to,
              so the how-to is one click from the errand it explains. */}
          <section className="max-lg:order-6 max-lg:px-4 max-lg:pt-5">
            <h2 className="text-[12px] font-medium text-ink-3 max-lg:text-[14px] max-lg:text-ink-2">บันทึกที่เกี่ยวข้อง</h2>
            {linkedNotes.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink-3 max-lg:text-[14px]">ยังไม่มีบันทึก</p>
            ) : (
              <ul className="mt-1">
                {linkedNotes.map((n, i) => (
                  <li key={n.id} className={i < linkedNotes.length - 1 ? 'border-b border-rule-soft' : ''}>
                    <Link to={`/app/notes/${n.id}`} className="block py-3 hover:underline">
                      <span className="block text-[13px] max-lg:text-[16px]">{n.title}</span>
                      <span className="mt-0.5 block text-[12px] text-ink-3 max-lg:text-[13px]">{noteCategoryLabel[n.category]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/app/notes" className="mt-2 inline-flex min-h-9 items-center text-[12.5px] font-medium text-brand-strong underline underline-offset-2">
              + ผูกบันทึกเพิ่ม
            </Link>
          </section>
        </aside>
      </div>

      {/* Phone: the actions the sidebar holds on a desktop, pinned to the thumb. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-rule bg-sheet px-4 pt-3 lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {done ? (
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => setStatus('IN_PROGRESS', 'เปิดงานอีกครั้งแล้ว')}
            className="wc-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium"
          >
            <Icon name="undo" size={20} />เปิดงานอีกครั้ง
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setPostponing(true)} className="wc-lift flex min-h-12 w-[112px] shrink-0 items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium">
              <Icon name="clock" size={20} />เลื่อน
            </button>
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => setStatus('DONE', closedTitle)}
              className="wc-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-brand-strong text-[16px] font-medium text-on-dark disabled:opacity-55"
            >
              <Icon name="check" size={20} />ปิดงานนี้
            </button>
          </>
        )}
      </div>
      <PostponeSheet task={postponing ? task : null} onClose={() => setPostponing(false)} />

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} label="เมนูงานนี้">
        <SheetItem icon="chat" onClick={() => { setMenuOpen(false); ai.open() }}>ถามเรื่องงานนี้</SheetItem>
        <SheetItem icon="user" onClick={() => { setMenuOpen(false); setStatus('WAITING', `เปลี่ยนสถานะเป็น ${statusLabel.WAITING} แล้ว`) }}>รอคนอื่น</SheetItem>
        <SheetItem icon="folder" onClick={() => { setMenuOpen(false); setProjectSheet(true) }}>ย้ายโปรเจกต์</SheetItem>
        <SheetItem
          icon="copy"
          onClick={() => {
            setMenuOpen(false)
            void navigator.clipboard?.writeText(window.location.href).then(
              () => toast({ title: 'คัดลอกลิงก์งานแล้ว' }),
              () => toast({ tone: 'error', title: 'คัดลอกไม่สำเร็จ' }),
            )
          }}
        >
          คัดลอกลิงก์งาน
        </SheetItem>
        <SheetItem icon="trash" tone="late" onClick={() => { setMenuOpen(false); setConfirmingDelete(true) }}>ลบงาน</SheetItem>
      </BottomSheet>

      <BottomSheet open={projectSheet} onClose={() => setProjectSheet(false)} title="ย้ายโปรเจกต์">
        {(projects ?? []).filter((p) => !p.archivedAt).map((p) => (
          <SheetItem
            key={p.id}
            trailing={task.project?.id === p.id ? <Icon name="check" size={18} /> : undefined}
            onClick={() => {
              setProjectSheet(false)
              if (task.project?.id === p.id) return
              save('โปรเจกต์', { projectId: p.id }, task.project ? { projectId: task.project.id } : null, p.name)
            }}
          >
            <span className="flex items-center gap-2.5">
              <span className={`size-2 rounded-full ${projectDot[p.color]}`} aria-hidden />
              {p.name}
            </span>
          </SheetItem>
        ))}
      </BottomSheet>

      <ConfirmDialog
        open={confirmingDelete}
        title="ลบงานนี้"
        subject={task.title}
        body="งานจะถูกย้ายไปถังลบและกู้คืนได้ภายใน 30 วัน หลังจากนั้นจะถูกลบถาวรพร้อมไฟล์แนบทั้งหมด"
        consequences={[
          ...(unsent > 0 ? [`การเตือนที่ยังไม่ส่ง ${unsent} รายการ จะถูกยกเลิก`] : []),
          ...(files.length > 0 ? [`ไฟล์แนบ ${files.length} ไฟล์ จะถูกลบพร้อมกันเมื่อครบ 30 วัน`] : []),
        ]}
        confirmLabel="ลบงาน"
        cancelLabel="ไม่ลบ"
        destructive
        onConfirm={() => {
          // Snapshot BEFORE the write: เลิกทำ has to put back the task that was
          // there, not re-read a row the delete has already taken away.
          const snapshot: Task = task
          remove.mutate(task.id)
          toast({
            title: 'ลบงานแล้ว',
            body: 'กู้คืนได้ภายใน 30 วัน',
            action: { label: 'เลิกทำ', onAct: () => restore.mutate(snapshot) },
          })
          void navigate('/app/tasks')
        }}
        onClose={() => setConfirmingDelete(false)}
      />
    </>
  )
}

/** Title, deadline line, then the detail/aside split at the same column widths. */
function TaskDetailSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดงาน">
      <Block w="120px" h="11px" />
      <Block w="min(420px, 80%)" h="34px" className="mt-2.5" />
      <Block w="260px" h="15px" className="mt-4" />
      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div>
          <Block w="90px" h="20px" />
          <div className="mt-3 rounded-sheet border border-rule bg-sheet px-5 py-4">
            <Block w="100%" h="13px" />
            <Block w="76%" h="13px" className="mt-2.5" />
          </div>
          {/* รายการย่อย and ไฟล์แนบ, at the row heights they settle at. */}
          {[0, 1].map((section) => (
            <div key={section}>
              <Block w="84px" h="20px" className="mt-8" />
              <div className="mt-3 rounded-sheet border border-rule bg-sheet px-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-3.5">
                    <Block w="15px" h="15px" />
                    <Block w={`${230 - i * 26}px`} h="13px" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <Block w="100%" h="42px" className="rounded-control" />
          <Block w="100%" h="42px" className="mt-2.5 rounded-control" />
          <div className="mt-8 rounded-sheet border border-rule bg-sheet px-5">
            {/* Six control rows at 50px and two facts at 38px — Figma 282:26. */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex h-[50px] items-center justify-between gap-4">
                <Block w="60px" h="10px" />
                <Block w="96px" h="12px" />
              </div>
            ))}
            {[0, 1].map((i) => (
              <div key={i} className="flex h-[38px] items-center justify-between gap-4">
                <Block w="52px" h="10px" />
                <Block w="80px" h="10px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  )
}

function Section({ title, note, className = '', bare, children }: {
  title: string; note?: string; className?: string; bare?: boolean; children: React.ReactNode
}) {
  // On a phone a section is a full-width band: a grey heading with its count, then
  // rows edge to edge. The description has no heading there; it is the title's prose.
  return (
    <section className={className}>
      <header className={`flex items-center justify-between max-lg:justify-start max-lg:gap-2 max-lg:bg-ground max-lg:px-4 max-lg:pt-5 max-lg:pb-2.5 ${bare ? 'max-lg:hidden' : ''}`}>
        <h2 className="t-section max-lg:font-sans max-lg:text-[14px] max-lg:font-medium max-lg:text-ink-2">{title}</h2>
        {note && <p className="t-caption text-ink-3 max-lg:text-[14px]">{note}</p>}
      </header>
      <div className={bare ? 'mt-2 max-lg:mt-0' : 'mt-3 rounded-sheet border border-rule bg-sheet max-lg:mt-0 max-lg:rounded-none max-lg:border-x-0'}>{children}</div>
    </section>
  )
}

/**
 * The description, with any http(s) address in it drawn as a real link — rel
 * noopener noreferrer nofollow, opening in a new tab. The text is split into
 * strings and anchors by lib/links.ts and rendered by React, so nothing in it is
 * ever interpreted as markup. A link cannot sit inside the edit button, so while
 * there is one the paragraph is plain and a "แก้" button beside it opens the editor.
 */
function DescriptionField({ value, onCommit }: { value: string; onCommit: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const pieces = linkify(value)
  const field = {
    label: 'รายละเอียด',
    value,
    placeholder: 'ยังไม่ได้ใส่รายละเอียด',
    multiline: true,
    maxLength: 4000,
    textClass: 't-body text-ink-2 leading-[1.75] whitespace-pre-wrap max-lg:text-[16px]',
    onCommit,
  }
  if (!pieces.some((p) => p.href)) return <InlineText {...field} />
  if (editing) return <InlineText {...field} startEditing onDone={() => setEditing(false)} />
  return (
    <div
      className="flex items-start gap-2"
      // Tapping the prose edits it; a tap on a link follows the link instead.
      onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) setEditing(true) }}
    >
      <p className="t-body min-w-0 flex-1 leading-[1.75] break-words whitespace-pre-wrap text-ink-2 max-lg:text-[16px]">
        {pieces.map((piece, i) =>
          piece.href ? (
            <a key={i} href={piece.href} target="_blank" rel={LINK_REL} className="font-medium text-brand-strong underline underline-offset-2">
              {piece.text}
            </a>
          ) : (
            <span key={i}>{piece.text}</span>
          ),
        )}
      </p>
      <button type="button" onClick={() => setEditing(true)} className="sr-only focus:not-sr-only focus:min-h-11 focus:shrink-0 focus:px-2 focus:text-[13px] focus:text-ink-3">
        แก้รายละเอียด
      </button>
    </div>
  )
}

/**
 * A row of ข้อมูลงาน that holds a control — Figma 282:29, 50px tall.
 *
 * The height is not decoration: at 390px this row IS the tap target, and 50
 * clears the 44 a thumb needs without the control itself having to be a box.
 */
function PropRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50px] items-center justify-between gap-4 border-b border-rule-soft px-4 lg:px-5">
      <span className="t-meta shrink-0 text-ink-3 max-lg:text-[14px]">{k}</span>
      {children}
    </div>
  )
}

/**
 * A row of ข้อมูลงาน the server owns — Figma 282:62, 38px tall and no control.
 *
 * Shorter than the editable rows on purpose. The difference in height is the
 * quietest way to say these two are a different kind of fact, and it costs a
 * reader nothing to notice.
 */
function Fact({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex min-h-[38px] items-center justify-between gap-4 px-4 lg:px-5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="t-meta text-ink-3 max-lg:text-[14px]">{k}</span>
      <span className="font-mono text-[12px] max-lg:text-[13px]">{v}</span>
    </div>
  )
}

/** What a section says when it has nothing in it. Never a blank sheet. */
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="t-body text-ink-3 px-4 py-4 leading-relaxed lg:px-5">{children}</p>
}

/**
 * One line of "รายการย่อย" — Figma 37:389.
 *
 * The box and the text are now two controls, not one: the text can be renamed,
 * so a click on it can no longer mean "tick". The checkbox keeps a 44px column
 * of its own so the thumb target survives the split, and it carries the line as
 * its accessible name — a checkbox called nothing is a checkbox nobody can use.
 *
 * A finished line is marked by BOTH the filled box and the recede to ink/3: a
 * tick that only changed colour would be invisible to a reader who cannot see
 * the green.
 */
function SubtaskRow({ item, onTick, onRename }: {
  item: Subtask
  onTick: () => void
  onRename: (next: string) => void
}) {
  return (
    <div className="flex items-center gap-1 border-b border-rule-soft px-4 lg:px-5">
      <label className="flex min-h-11 w-11 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={item.done}
          onChange={onTick}
          aria-label={item.text}
          className="size-[22px] shrink-0 accent-[var(--wc-brand-emerald)] lg:size-[15px]"
        />
      </label>
      <div className="min-w-0 flex-1">
        <InlineText
          label="รายการย่อย"
          value={item.text}
          required
          maxLength={255}
          textClass={`text-[13px] leading-[1.5] max-lg:text-[16px] ${item.done ? 'text-ink-3 line-through' : ''}`}
          onCommit={onRename}
        />
      </div>
    </div>
  )
}

/**
 * One row of "การเตือน".
 *
 * A reminder that has not fired yet is drawn in its time colour; one that has
 * recedes. The state is always a WORD as well — "รอส่ง", "ส่งแล้ว" — because
 * this column is the one place the product makes a claim about the outside
 * world, and a claim that only exists as a shade of grey is not a claim.
 */
function ReminderRow({ reminder, now, last }: { reminder: TaskReminder; now: Date; last: boolean }) {
  const future = new Date(reminder.at).getTime() > now.getTime()
  return (
    <div className={`px-4 py-3.5 lg:px-5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-mono text-[12px] font-medium ${future ? 'text-time-today' : 'text-ink-3'}`}>
          {clock(reminder.at)}
        </span>
        <span className={`t-caption shrink-0 ${notificationTone[reminder.status]}`}>
          {notificationLabel[reminder.status]}
        </span>
      </div>
      <p className={`t-meta mt-0.5 ${future ? 'text-ink-2' : 'text-ink-3'}`}>{reminder.why}</p>
    </div>
  )
}

function Row({ when, what, last }: { when: string; what: string; last?: boolean }) {
  return (
    <div className={`flex gap-4 px-4 py-3 lg:px-5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="t-caption w-[104px] shrink-0 text-ink-3 lg:w-40 max-lg:text-[13px]">{when}</span>
      <span className="t-body text-ink-2 max-lg:text-[15px]">{what}</span>
    </div>
  )
}
