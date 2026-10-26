import { useState } from 'react'
import { recordAiOutcome, useCreateTask, useUpdateTask, type AiAction, type AiOutcome } from '../lib/api'
import { projectDot, statusLabel } from '../lib/style'
import { fromLocalInput, localInput, stamp } from '../lib/time'
import type { Project, Task } from '../lib/types'
import { useToast } from './Toast'
import { useDecisions, type Decision } from '../lib/aiDecisions'
import { isUnusable, statusToApply } from '../lib/aiRules'

/**
 * What the AI proposed, as buttons — and the one rule that matters here: nothing
 * is applied without a click. A button opens a confirmation that says exactly
 * what will change, lets the person adjust it, and only its own button writes —
 * through the same task endpoints a manual edit uses. Whatever they decide is
 * reported back (ACCEPTED, EDITED or DISMISSED) for the habit memory.
 *
 * The "…" on every label is the design's promise (Figma 446:2424) that a click
 * opens something rather than acting at once.
 */

export function AiActionButton({ action, decision, open, onToggle, missing: gone }: {
  action: AiAction
  decision?: Decision
  open: boolean
  onToggle: () => void
  missing?: boolean
}) {
  const unusable = isUnusable(action)
  const missing = gone || unusable
  if (decision) {
    return (
      <span className="inline-flex min-h-9 items-center rounded-control border border-rule-soft px-3 py-1.5 text-[13px] text-ink-3">
        {decision === 'applied' ? `✓ ${action.label}` : `${action.label} · ไม่ใช้`}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={missing}
      aria-expanded={open}
      title={unusable ? 'ทำในแอปไม่ได้' : gone ? 'ไม่พบงานนี้แล้ว' : undefined}
      className={`wc-lift inline-flex min-h-9 items-center rounded-control border px-3 py-1.5 text-[13px] font-medium disabled:opacity-55 ${
        open ? 'border-ink bg-ground' : 'border-rule bg-sheet'
      }`}
    >
      {unusable ? `${action.label} (ทำในแอปไม่ได้)` : gone ? `${action.label} (ไม่พบงานแล้ว)` : `${action.label}…`}
    </button>
  )
}

/**
 * The confirmation. Says what will change in the person's own terms — which
 * task, to what — with the value editable where editing makes sense.
 */
export function AiActionConfirm({ action, tasks, projects, onDecided, onCancel }: {
  action: AiAction
  tasks: Task[]
  projects: Project[]
  onDecided: (decision: Decision) => void
  onCancel: () => void
}) {
  const create = useCreateTask()
  const update = useUpdateTask()
  const toast = useToast()
  const task = tasks.find((t) => t.id === action.taskId)
  const live = projects.filter((p) => !p.archivedAt)

  const [title, setTitle] = useState(action.title ?? '')
  const [due, setDue] = useState(action.dueAt ? localInput(action.dueAt) : '')
  const [projectId, setProjectId] = useState(action.projectId ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending

  const finalDue = due ? fromLocalInput(due) : null
  const edited =
    (action.type === 'CREATE_TASK' && (title.trim() !== (action.title ?? '') || finalDue !== (action.dueAt ? new Date(action.dueAt).toISOString() : null) || projectId !== (action.projectId ?? ''))) ||
    (action.type === 'SET_DUE' && finalDue !== (action.dueAt ? new Date(action.dueAt).toISOString() : null)) ||
    (action.type === 'SET_PROJECT' && projectId !== (action.projectId ?? ''))

  const report = (outcome: AiOutcome) => recordAiOutcome(action.id, outcome, {
    ...(action.type === 'CREATE_TASK' ? { title: title.trim(), dueAt: finalDue, projectId: projectId || null } : {}),
    ...(action.type === 'SET_DUE' ? { dueAt: finalDue } : {}),
    ...(action.type === 'SET_PROJECT' ? { projectId: projectId || null } : {}),
  })

  const done = (message: string) => {
    void report(edited ? 'EDITED' : 'ACCEPTED')
    onDecided('applied')
    toast({ title: message, body: action.type === 'CREATE_TASK' ? title.trim() : task?.title })
  }
  const failed = (err: Error) => setError(err.message)

  const apply = () => {
    setError(null)
    if (action.type === 'CREATE_TASK') {
      if (!title.trim()) return setError('ใส่ชื่องานก่อน')
      create.mutate(
        { title: title.trim(), dueAt: finalDue, projectId: projectId || undefined },
        { onSuccess: () => done('เพิ่มงานแล้ว'), onError: failed },
      )
    } else if (!task) {
      setError('ไม่พบงานนี้แล้ว อาจถูกลบหรือย้ายไป')
    } else if (action.type === 'SET_DUE') {
      if (!finalDue) return setError('เลือกวันและเวลาก่อน')
      update.mutate({ id: task.id, patch: { dueAt: finalDue } }, { onSuccess: () => done('เลื่อนกำหนดแล้ว'), onError: failed })
    } else if (action.type === 'SET_PROJECT') {
      if (!projectId) return setError('เลือกโปรเจกต์ก่อน')
      update.mutate({ id: task.id, patch: { projectId } }, { onSuccess: () => done('ย้ายโปรเจกต์แล้ว'), onError: failed })
    } else if (action.type === 'SET_STATUS') {
      const status = statusToApply(action.status)
      // Refused, not written: an unknown status would change nothing while the
      // screen — and the habit memory — recorded it as done.
      if (!status) return setError('สถานะที่ AI เสนอไม่ใช่สถานะที่แอปรู้จัก จึงไม่ได้เปลี่ยน')
      update.mutate({ id: task.id, patch: { status } }, { onSuccess: () => done('เปลี่ยนสถานะแล้ว'), onError: failed })
    } else {
      setError('คำแนะนำนี้ทำในแอปไม่ได้')
    }
  }

  const dismiss = () => {
    void recordAiOutcome(action.id, 'DISMISSED')
    onDecided('dismissed')
  }

  const verb = {
    CREATE_TASK: 'เพิ่มงาน',
    SET_DUE: 'เลื่อนกำหนด',
    SET_PROJECT: 'ย้ายโปรเจกต์',
    SET_STATUS: 'เปลี่ยนสถานะ',
  }[action.type]

  return (
    <div className="w-full rounded-control border border-rule bg-sheet px-3.5 py-3">
      {action.type === 'CREATE_TASK' ? (
        <>
          <p className="text-[12px] font-medium text-ink-3">เพิ่มงานใหม่</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            aria-label="ชื่องาน"
            className="mt-1.5 h-9 w-full rounded-control border border-rule bg-ground px-2.5 text-[13px]"
          />
        </>
      ) : (
        <p className="text-[13px] leading-[1.45] text-ink-2">
          {task ? <span className="font-medium text-ink">{task.title}</span> : 'งานนี้'}
          {action.type === 'SET_DUE' && task?.dueAt && <span className="text-ink-3"> · เดิม {stamp(task.dueAt)}</span>}
        </p>
      )}

      {(action.type === 'SET_DUE' || action.type === 'CREATE_TASK') && (
        <label className="mt-2 block">
          <span className="text-[12px] text-ink-3">{action.type === 'SET_DUE' ? 'กำหนดส่งใหม่' : 'กำหนดส่ง'}</span>
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="mt-1 h-9 w-full rounded-control border border-rule bg-ground px-2.5 font-mono text-[12px]"
          />
        </label>
      )}

      {(action.type === 'SET_PROJECT' || (action.type === 'CREATE_TASK' && live.length > 0)) && (
        <div className="mt-2">
          <span className="text-[12px] text-ink-3">โปรเจกต์</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {live.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={projectId === p.id}
                onClick={() => setProjectId(projectId === p.id && action.type === 'CREATE_TASK' ? '' : p.id)}
                className={`flex min-h-[32px] items-center gap-1.5 rounded-control border px-2.5 text-[12px] ${
                  projectId === p.id ? 'border-ink bg-ink/[0.04] font-medium' : 'border-rule'
                }`}
              >
                <span className={`size-1.5 rounded-full ${projectDot[p.color]}`} aria-hidden />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {action.type === 'SET_STATUS' && statusToApply(action.status) && (
        <p className="mt-1.5 text-[13px] text-ink-2">
          เปลี่ยนสถานะเป็น <span className="font-medium text-ink">{statusLabel[statusToApply(action.status)!]}</span>
        </p>
      )}
      {action.reason && <p className="mt-1.5 text-[12px] leading-[1.45] text-ink-3">{action.reason}</p>}

      {error && <p role="alert" className="mt-2 text-[12px] text-error">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={dismiss} disabled={busy} className="wc-lift min-h-9 rounded-control px-3 text-[13px] text-ink-2">
          ไม่ใช้
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="wc-lift min-h-9 rounded-control px-3 text-[13px] text-ink-2">
          ปิด
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={busy}
          className="wc-lift ml-auto min-h-9 rounded-control bg-brand px-3.5 text-[13px] font-medium text-on-dark disabled:opacity-55"
        >
          {busy ? 'กำลังบันทึก…' : verb}
        </button>
      </div>
    </div>
  )
}

/** A row of action buttons with the confirmation opening under them. */
export function AiActionList({ actions, tasks, projects }: { actions: AiAction[]; tasks: Task[]; projects: Project[] }) {
  const { decided, decide } = useDecisions()
  const [open, setOpen] = useState<string | null>(null)
  if (actions.length === 0) return null
  const current = actions.find((a) => a.id === open)

  return (
    <div className="flex w-full flex-col gap-2">
      <ul className="flex flex-col items-start gap-2">
        {actions.map((a) => (
          <li key={a.id} className="flex max-w-full flex-col items-start gap-1">
            <AiActionButton
              action={a}
              decision={decided[a.id]}
              open={open === a.id}
              missing={a.type !== 'CREATE_TASK' && !tasks.some((t) => t.id === a.taskId)}
              onToggle={() => setOpen(open === a.id ? null : a.id)}
            />
            {/* The AI's reason, as the secondary line under its button. */}
            {a.reason && <span className="pl-1 text-[12px] leading-[1.45] text-ink-3">{a.reason}</span>}
          </li>
        ))}
      </ul>
      {current && !decided[current.id] && (
        <AiActionConfirm
          key={current.id}
          action={current}
          tasks={tasks}
          projects={projects}
          onCancel={() => setOpen(null)}
          onDecided={(d) => {
            decide(current.id, d)
            setOpen(null)
          }}
        />
      )}
    </div>
  )
}
