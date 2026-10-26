import type { Subtask, Task } from './types'

/**
 * The reading logic behind a task, kept out of the components for the same
 * reason `notes.ts` is: so the inbox card, the task detail and the admin event
 * table cannot disagree about what "unsure" means, and so the rules can be
 * tested without a DOM.
 */

/**
 * The needs-review threshold, mirroring the backend's `REVIEW_THRESHOLD` of 80
 * (LineInboundProcessor), on the 0–1 scale api.ts normalises confidence to.
 *
 * A LINE draft that scored below this is deliberately left unscheduled: the
 * parser read a time it could not pin down, and a reminder set from a guess is
 * worse than no reminder, because it teaches people the reminders are wrong.
 * The number lives here as ONE constant so the badge, the filter and the admin
 * table cannot drift to three different definitions of the same word.
 */
export const NEEDS_REVIEW_BELOW = 0.8

/**
 * Whether a task is a LINE draft the parser was not sure about.
 *
 * Only ever true in the inbox: once a person has given the task a deadline the
 * parse is no longer what decides anything, so the card stops asking.
 */
export function needsReview(task: Task): boolean {
  return (
    task.status === 'INBOX' &&
    task.parseConfidence !== undefined &&
    task.parseConfidence < NEEDS_REVIEW_BELOW
  )
}

/** "2 จาก 4 เสร็จแล้ว" — the count drawn beside the subtask heading. */
export function subtaskProgress(subtasks: Subtask[] | undefined): { done: number; total: number } {
  const list = subtasks ?? []
  return { done: list.filter((s) => s.done).length, total: list.length }
}

/** Ticks one subtask, returning a fresh array. Pure, so the store stays dumb. */
export function toggleSubtask(subtasks: Subtask[], id: string): Subtask[] {
  return subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
}

/** Renames one subtask, returning a fresh array. Pure, so the store stays dumb. */
export function renameSubtask(subtasks: Subtask[], id: string, text: string): Subtask[] {
  return subtasks.map((s) => (s.id === id ? { ...s, text } : s))
}

/**
 * Appends a subtask — Figma 37:494, "เพิ่มรายการย่อย".
 *
 * The id is generated here rather than by the server for the same reason the
 * tick is optimistic: the row has to appear under the caret at once, and a
 * subtask is a line of text on a task, not a record anyone else will reference.
 */
export function addSubtask(subtasks: Subtask[] | undefined, text: string): Subtask[] {
  return [...(subtasks ?? []), { id: `s_${Math.random().toString(36).slice(2, 10)}`, text, done: false }]
}

/**
 * How a confidence score reads on the admin event table — Figma 216:1565.
 *
 * The word comes first and the number second, so a reader who cannot compare
 * two decimals at a glance still gets the verdict, and a reader who wants the
 * number still has it.
 */
export function confidenceLabel(score: number): string {
  if (score < NEEDS_REVIEW_BELOW) return 'ต่ำ'
  if (score < 0.85) return 'กลาง'
  return 'สูง'
}
