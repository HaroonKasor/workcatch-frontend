import { useEffect, useId, useRef, useState } from 'react'

/**
 * แก้ในที่ — Figma 282:2 ("แก้ไขงาน — แก้ในที่", page "05 — สถานะและข้อความ").
 *
 * The board's argument, kept here because it is the reason this is not a dialog
 * and not an edit mode: a task is written down in the middle of somebody asking
 * for it, so almost every task is missing something, and the thing that is
 * missing is always ONE field. An "แก้ไข" button would make you decide what you
 * are about to change before it lets you change anything — backwards, because
 * you pressed it in the first place having already noticed what is wrong.
 *
 * Three states per field and nothing else:
 *   resting  no box, no pencil, no button. The screen reads as a document.
 *   pointed  a 4% ink wash and the word "แก้" at the right edge. There are ten
 *            of these on the screen, so it says "pressable" and then stops.
 *   editing  a 1.5px ink border, a caret, and "Enter บันทึก · Esc ยกเลิก".
 *
 * There is no save button. A one-field edit that needs confirming is a form;
 * this commits on Enter or on blur, abandons on Escape, and the undo lives in
 * the toast afterwards — the trade the rest of the app already makes.
 *
 * Hover is never the only affordance, because on the 390 frame there is no
 * hover at all. Every trigger is a real <button>, so Tab reaches it and Enter
 * or Space opens it; every trigger clears 44px; and `.wc-edit-mark` in
 * index.css pins the mark and the wash on under `(hover: none)`.
 */

export interface InlineTextProps {
  /** The field's name. Spoken after the value, and printed in the toast. */
  label: string
  /** What the editor opens with, and what a commit is compared against. */
  value: string
  /** What the resting state shows, when that is not the raw value. */
  display?: string
  /** What the resting state shows when there is no value. */
  placeholder?: string
  /** Called only when the committed value actually differs from `value`. */
  onCommit: (next: string) => void
  multiline?: boolean
  type?: 'text' | 'datetime-local'
  /** Type classes shared by the resting text and the editor, so nothing moves. */
  textClass?: string
  align?: 'left' | 'right'
  /**
   * The server rejects a blank title (TaskUpdateRequest, @Size(min = 1)), so
   * the field refuses it here rather than letting the round trip fail.
   */
  required?: boolean
  /** Said under the editor when Enter is pressed on an empty required field. */
  requiredMessage?: string
  maxLength?: number
  /** The "แก้" mark. Off in ข้อมูลงาน, where the wash is the whole affordance. */
  mark?: boolean
  /** Overrides the screen-reader suffix. Pass "" where the visible text says it. */
  srSuffix?: string
}

export function InlineText({
  label,
  value,
  display,
  placeholder = '—',
  onCommit,
  multiline = false,
  type = 'text',
  textClass = 'text-[12.5px]',
  align = 'left',
  required = false,
  requiredMessage,
  maxLength,
  mark = true,
  srSuffix,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [problem, setProblem] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  /** One edit ends once. Enter closes the editor, which also fires blur. */
  const settled = useRef(false)
  /** Only a keyboard exit puts focus back on the trigger; a click must not. */
  const restore = useRef(false)
  const hintId = useId()
  const problemId = useId()

  useEffect(() => {
    if (!editing) {
      if (restore.current) {
        restore.current = false
        trigger.current?.focus()
      }
      return
    }
    const el = field.current
    if (!el) return
    el.focus()
    // Caret at the end, never a select-all: you press a field to change what is
    // already in it, and a select-all means the next keystroke destroys it.
    if (type !== 'datetime-local') el.setSelectionRange(el.value.length, el.value.length)
  }, [editing, type])

  // A description is a paragraph, so the editor is as tall as the paragraph
  // rather than a fixed box that scrolls its own second line out of sight.
  useEffect(() => {
    const el = field.current
    if (!editing || !(el instanceof HTMLTextAreaElement)) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editing, draft])

  function open() {
    setDraft(value)
    setProblem(null)
    settled.current = false
    setEditing(true)
  }

  function abandon(byKeyboard: boolean) {
    if (settled.current) return
    settled.current = true
    restore.current = byKeyboard
    setProblem(null)
    setEditing(false)
  }

  function commit(byKeyboard: boolean) {
    if (settled.current) return
    const next = draft.trim()
    if (required && next === '') {
      // Enter on an empty required field says why and stays open. Clicking away
      // is a person leaving, so that abandons instead of trapping them in it.
      if (byKeyboard && requiredMessage) {
        setProblem(requiredMessage)
        return
      }
      abandon(byKeyboard)
      return
    }
    settled.current = true
    restore.current = byKeyboard
    setEditing(false)
    if (next !== value) onCommit(next)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      abandon(true)
      return
    }
    if (e.key !== 'Enter') return
    // Shift+Enter is the only way to get a second paragraph, since the hint the
    // design specifies gives Enter to saving.
    if (multiline && e.shiftKey) return
    e.preventDefault()
    commit(true)
  }

  if (!editing) {
    const shown = display ?? value
    return (
      <button
        ref={trigger}
        type="button"
        onClick={open}
        className={`wc-editable flex min-h-11 items-center gap-2 rounded-control px-2.5 py-1 transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04] ${
          align === 'right' ? 'ml-auto min-w-11 max-w-full justify-end text-right' : '-mx-2.5 w-full text-left'
        }`}
      >
        <span
          className={`min-w-0 ${align === 'right' ? 'truncate' : 'flex-1'} ${
            shown ? '' : 'text-ink-3'
          } ${textClass}`}
        >
          {shown || placeholder}
        </span>
        {mark && (
          <span aria-hidden className="wc-edit-mark t-caption shrink-0 text-ink-3">
            แก้
          </span>
        )}
        <span className="sr-only">{srSuffix ?? ` — แก้ไข${label}`}</span>
      </button>
    )
  }

  const editorClass = `w-full rounded-control border-[1.5px] border-ink bg-sheet px-2.5 py-1 focus:outline-none ${
    align === 'right' ? 'text-right' : ''
  } ${textClass}`

  return (
    <div className={`w-full ${align === 'right' ? 'flex flex-col items-end' : ''}`}>
      {multiline ? (
        <textarea
          ref={(el) => {
            field.current = el
          }}
          aria-label={label}
          aria-describedby={problem ? `${hintId} ${problemId}` : hintId}
          value={draft}
          maxLength={maxLength}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(false)}
          className={`${editorClass} resize-none`}
        />
      ) : (
        <input
          ref={(el) => {
            field.current = el
          }}
          type={type}
          aria-label={label}
          aria-describedby={problem ? `${hintId} ${problemId}` : hintId}
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(false)}
          className={`${editorClass} min-h-11`}
        />
      )}
      {/* Figma 282:22. The only instruction the field gives, and it is the whole
          contract: nothing else on the row claims to save anything. */}
      <p id={hintId} className="t-caption mt-1.5 text-ink-3">
        Enter บันทึก · Esc ยกเลิก
      </p>
      {problem && (
        <p id={problemId} role="alert" className="t-meta mt-1 text-error">
          {problem}
        </p>
      )}
    </div>
  )
}

export interface InlineSelectOption {
  value: string
  label: string
  /** The project dot, drawn inside the option row's own colour rule. */
  dot?: string
}

/**
 * The ⌄ rows of ข้อมูลงาน — สถานะ, ความสำคัญ, โปรเจกต์ (Figma 282:31/38/49).
 *
 * A native <select> rather than a listbox of our own: it is reachable by Tab,
 * opens on Enter or Space, works with a thumb, and is the one control a screen
 * reader never has to be told about. It is transparent at rest so the panel
 * still reads as a document, and takes the same 4% wash as every other field
 * when it is pointed at or focused.
 */
export function InlineSelect({
  label,
  value,
  options,
  onCommit,
  dot,
}: {
  label: string
  value: string
  options: InlineSelectOption[]
  onCommit: (next: string) => void
  dot?: string
}) {
  return (
    <span className="ml-auto flex min-w-0 items-center justify-end gap-2">
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />}
      <span className="relative flex min-w-0 items-center">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onCommit(e.target.value)}
          className="wc-editable min-h-11 w-full cursor-pointer appearance-none truncate rounded-control bg-transparent py-1 pr-6 pl-2.5 text-right text-[12.5px] transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-2 text-[12px] text-ink-3">
          ⌄
        </span>
      </span>
    </span>
  )
}
