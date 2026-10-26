import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeleteTask, useProjects, useRestoreTask, useUpdateTask } from '../../lib/api'
import { projectDot } from '../../lib/style'
import { bangkokAt, clock, fromLocalInput, sinceLabel } from '../../lib/time'
import type { Task } from '../../lib/types'
import { needsReview } from '../../lib/tasks'
import { useToast } from '../Toast'
import { ConfirmDialog } from '../ConfirmDialog'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { MobileHeader } from './MobileHeader'
import { MobileEmpty } from './States'
import { ListGroup } from './SwipeRow'

/**
 * กล่องรับงาน on a phone — Figma 465:547, with its two sheets: 460:152 (file a
 * capture) and 465:676 (the time was unclear).
 *
 * Two groups, by how long they have waited: past the 24 hours the system gives
 * itself, and not yet. A row opens a sheet rather than a page, because the job
 * here is to file a capture in one gesture: a time, a project, ย้ายไปงาน.
 */

/** "31 ชม." / "35 นาที" — how long it has sat in the box. */
function waited(task: Task, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / 60_000))
  return minutes < 60 ? `${minutes} นาที` : `${Math.floor(minutes / 60)} ชม.`
}

export function InboxMobile({ items, now }: { items: Task[]; now: Date }) {
  const [open, setOpen] = useState<string | null>(null)
  const over = (t: Task) => now.getTime() - new Date(t.createdAt).getTime() > 24 * 3_600_000
  const late = items.filter(over)
  const rest = items.filter((t) => !over(t))
  const current = items.find((t) => t.id === open) ?? null

  const rows = (list: Task[], isLate: boolean) =>
    list.map((t) => (
      <li key={t.id} className="border-b border-rule-soft bg-sheet">
        <button type="button" onClick={() => setOpen(t.id)} aria-haspopup="dialog" className="flex min-h-[64px] w-full items-start gap-3 px-4 py-3 text-left">
          <span className={`w-[60px] shrink-0 pt-[3px] font-mono text-[13px] leading-[1.45] ${isLate ? 'font-semibold text-time-late' : 'text-ink-3'}`}>{waited(t, now)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] leading-[1.35] font-normal">{t.title}</span>
            <span className="mt-0.5 block truncate text-[13px] leading-[1.4] text-ink-3">
              {[t.source ?? 'เพิ่มเอง', t.requester].filter(Boolean).join(' · ')}
            </span>
          </span>
        </button>
      </li>
    ))

  return (
    <div className="lg:hidden">
      <MobileHeader title="กล่องรับงาน" count={items.length} />
      {items.length === 0 && <MobileEmpty icon="inbox">กล่องรับงานว่างแล้ว</MobileEmpty>}
      {late.length > 0 && <ListGroup label="เกินเวลาจัด" count={late.length} tone="late">{rows(late, true)}</ListGroup>}
      {rest.length > 0 && <ListGroup label="ยังไม่ได้จัด" count={rest.length}>{rows(rest, false)}</ListGroup>}
      <TriageSheet key={current?.id ?? 'none'} task={current} now={now} onClose={() => setOpen(null)} />
    </div>
  )
}

function TriageSheet({ task, now, onClose }: { task: Task | null; now: Date; onClose: () => void }) {
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const restore = useRestoreTask()
  const projects = useProjects()
  const toast = useToast()
  const [due, setDue] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [custom, setCustom] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const review = !!task && needsReview(task)
  const live = (projects.data ?? []).filter((p) => !p.archivedAt)
  const today17 = bangkokAt(0, 17, now)
  const choices = [
    ...(today17.getTime() > now.getTime() ? [{ label: `วันนี้ ${clock(today17.toISOString())}`, at: today17.toISOString() }] : []),
    { label: `พรุ่งนี้ ${clock(bangkokAt(1, 9, now).toISOString())}`, at: bangkokAt(1, 9, now).toISOString() },
  ]
  const candidates = (task?.parseCandidates ?? []).filter((c) => Date.parse(c.dueAt) > now.getTime())

  const file = (patch: Parameters<typeof update.mutate>[0]['patch']) => {
    if (!task) return
    update.mutate({ id: task.id, patch })
    onClose()
  }
  const moveOn = () => file({ status: 'TODO', ...(due ? { dueAt: due } : {}), ...(projectId ? { projectId } : {}) })

  const customForm = picking ? (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const at = fromLocalInput(custom)
        if (!at) return
        if (review) file({ dueAt: at })
        else { setDue(at); setPicking(false) }
      }}
    >
      <input type="datetime-local" autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="กำหนดส่ง" className="h-11 min-w-0 flex-1 rounded-control border border-rule bg-ground px-2 font-mono text-[14px]" />
      <button type="submit" disabled={!fromLocalInput(custom)} className="h-11 shrink-0 rounded-control bg-brand-strong px-4 text-[14px] font-medium text-on-dark disabled:opacity-55">ตกลง</button>
    </form>
  ) : null

  return (
    <>
    <BottomSheet
      open={!!task}
      onClose={onClose}
      title={task ? <Link to={`/app/tasks/${task.id}`} onClick={onClose}>{task.title}</Link> : undefined}
      footer={
        review ? (
          <div className="flex gap-3">
            <button type="button" onClick={onClose} aria-label="ปิด" className="flex size-12 shrink-0 items-center justify-center rounded-control border border-rule bg-sheet"><Icon name="close" size={20} /></button>
            <button type="button" onClick={() => file({ status: 'TODO' })} className="wc-lift min-h-12 flex-1 rounded-control border border-rule bg-sheet text-[16px] font-medium">ย้ายไปงานโดยไม่มีกำหนด</button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="wc-lift flex min-h-12 w-[96px] shrink-0 items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium"
            >
              <Icon name="trash" size={20} />ลบ
            </button>
            <button type="button" onClick={moveOn} className="wc-lift min-h-12 flex-1 rounded-control bg-brand-strong text-[16px] font-medium text-on-dark">ย้ายไปงาน</button>
          </div>
        )
      }
    >
      {task && (
        <div className="space-y-4 px-4 pb-2">
          {task.sourceMessage && (
            <div className="rounded-control bg-ground px-3 py-2.5">
              <p className="text-[13px] text-ink-3">
                {[task.requester, task.source ?? 'LINE', sinceLabel(task.createdAt, now)].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-[15px] leading-[1.45] whitespace-pre-line">{task.sourceMessage}</p>
            </div>
          )}

          {review ? (
            <div>
              <p className="flex items-center gap-2 text-[14px] text-time-soon-strong">
                <Icon name="clock" size={18} />อ่านเวลาไม่ชัด — เลือกกำหนดส่ง
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[...candidates.map((c) => ({ label: c.label, at: c.dueAt })), choices[choices.length - 1]].map((c) => (
                  <button key={c.at} type="button" onClick={() => file({ dueAt: c.at })} className="wc-lift flex min-h-14 items-center rounded-control border border-rule bg-sheet px-3 text-left font-mono text-[14px]">{c.label}</button>
                ))}
                <button type="button" onClick={() => setPicking(true)} className="wc-lift flex min-h-14 items-center rounded-control border border-rule bg-sheet px-3 text-left text-[14px]">เลือกวัน</button>
              </div>
              {customForm}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-[14px] text-ink-3">กำหนดส่ง</p>
                <div className="grid grid-cols-3 gap-2">
                  {choices.map((c) => (
                    <Pick key={c.at} on={due === c.at} onClick={() => setDue(due === c.at ? null : c.at)}>{c.label}</Pick>
                  ))}
                  <Pick on={!!due && !choices.some((c) => c.at === due)} onClick={() => { setCustom(''); setPicking(true) }}>เลือกวัน</Pick>
                </div>
                {customForm}
              </div>
              {live.length > 0 && (
                <div>
                  <p className="mb-2 text-[14px] text-ink-3">โปรเจกต์</p>
                  <div className="flex flex-wrap gap-2">
                    {live.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={projectId === p.id}
                        onClick={() => setProjectId(projectId === p.id ? null : p.id)}
                        className={`flex min-h-11 items-center gap-2 rounded-control border px-3.5 text-[14px] ${projectId === p.id ? 'border-brand bg-selected font-medium' : 'border-rule bg-sheet'}`}
                      >
                        <span className={`size-2 rounded-full ${projectDot[p.color]}`} aria-hidden />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </BottomSheet>
    <ConfirmDialog
      open={confirmingDelete}
      title="ลบงานนี้"
      subject={task?.title}
      body="งานจะถูกย้ายไปถังลบและกู้คืนได้ภายใน 30 วัน"
      confirmLabel="ลบงาน"
      cancelLabel="ไม่ลบ"
      destructive
      onConfirm={() => {
        if (!task) return
        const snapshot = task
        remove.mutate(task.id)
        toast({ title: 'ลบงานแล้ว', body: task.title, action: { label: 'เลิกทำ', onAct: () => restore.mutate(snapshot) } })
        setConfirmingDelete(false)
        onClose()
      }}
      onClose={() => setConfirmingDelete(false)}
    />
    </>
  )
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center rounded-control border px-2 text-[14px] ${on ? 'border-brand bg-selected font-medium' : 'border-rule bg-sheet'}`}
    >
      {children}
    </button>
  )
}
