import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { quickParseQuery, useCreateTask, useProjects, type QuickParse } from '../lib/api'
import { useToast } from './Toast'
import { projectDot, timeText } from '../lib/style'
import { extractTag, matchTag, removeSpan, suggestProjects, tagAtCaret } from '../lib/projectTag'
import { gutterLabel, timeStateOf } from '../lib/time'
import type { Priority, Project, Task } from '../lib/types'

/**
 * Quick Add — Figma node 56:1151, and the v2 frame 433:1212 for the typed
 * shortcuts.
 *
 * NFR-UX-01 caps adding a task at two interactions, so the only required field
 * is the title and everything else is a chip you may ignore. The optional fields
 * stay collapsed rather than greyed out: a form that shows six empty inputs
 * teaches you that adding a task is expensive, and you stop doing it.
 *
 * The title also takes the two things people type anyway (v2, 433:1212):
 * "พรุ่งนี้ 10 โมง" becomes the deadline and "#ระบบคลัง" the project, with the
 * reading shown in a summary row under the input before anything is saved. The
 * date is read by the SERVER's parser — the one every LINE message goes through
 * — so a phrase means the same thing on both channels; the #tag follows the
 * same rules as the bot's (lib/projectTag.ts mirrors service/ProjectTag.java).
 *
 * Built on the native <dialog>, which brings focus trapping, Esc and an inert
 * background with no dependency and no home-grown focus management to get wrong.
 */

interface QuickAddApi {
  open: () => void
}

const Ctx = createContext<QuickAddApi>({ open: () => {} })

/** Lets any button anywhere raise the sheet. */
export function useQuickAdd(): QuickAddApi {
  return useContext(Ctx)
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'ต่ำ' },
  { value: 'MEDIUM', label: 'ปกติ' },
  { value: 'HIGH', label: 'สูง' },
  { value: 'URGENT', label: 'ด่วน' },
]

/**
 * The project the previous Quick Add in this tab was filed under. Session
 * storage, not local: "the project I am working in" is a fact about this sitting,
 * and tomorrow's first capture should not silently land where yesterday ended.
 * Wrapped because private windows and blocked storage throw on access.
 */
const LAST_PROJECT_KEY = 'wc.quickAdd.lastProject'

function readLastProject(): string {
  try {
    return sessionStorage.getItem(LAST_PROJECT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeLastProject(id: string | undefined) {
  try {
    if (id) sessionStorage.setItem(LAST_PROJECT_KEY, id)
    else sessionStorage.removeItem(LAST_PROJECT_KEY)
  } catch {
    // Remembering is a convenience; failing to remember changes nothing else.
  }
}

/** Waits for the typing to pause before asking the server to read the title. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return settled
}

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(false)

  const open = useCallback(() => {
    setMounted(true)
    // showModal must run after the dialog exists in the DOM.
    queueMicrotask(() => ref.current?.showModal())
  }, [])

  // The rail advertises "N", so it has to actually work. Ignore it while the
  // user is typing, or every "น" typed into a title reopens the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N' && e.key !== 'ๆ') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      open()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {mounted && <QuickAddSheet ref={ref} onClosed={() => setMounted(false)} />}
    </Ctx.Provider>
  )
}

function QuickAddSheet({
  ref,
  onClosed,
}: {
  ref: React.RefObject<HTMLDialogElement | null>
  onClosed: () => void
}) {
  const projects = useProjects()
  const create = useCreateTask()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const location = useLocation()
  const [params] = useSearchParams()
  const listId = useId()

  // A project page is /app/tasks?project=<id> (there is no projects/:id), and
  // opening Quick Add from one means "add to this". Otherwise the project the
  // last Quick Add in this tab used.
  const projectPage = location.pathname.match(/^\/app\/projects\/([^/]+)$/)?.[1]
  const pageProject = projectPage ?? (location.pathname === '/app/tasks' ? params.get('project') ?? '' : '')

  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [projectId, setProjectId] = useState(() => pageProject || readLastProject())
  const [priority, setPriority] = useState<Priority | ''>('')
  const [requester, setRequester] = useState('')
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [dismissedTagAt, setDismissedTagAt] = useState<number | null>(null)
  // Whether the person has moved through the list with the arrow keys. Until
  // they have, Enter adds the task: the list is a suggestion, not a trap.
  const [navigated, setNavigated] = useState(false)
  const [ignoredDue, setIgnoredDue] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // An archived project takes no new work (Figma 46:729), so it is not offered,
  // and a remembered id that has since been archived or deleted is dropped.
  const live: Project[] = (projects.data ?? []).filter((p) => !p.archivedAt)
  const chosen = live.find((p) => p.id === projectId)

  // The autocomplete: the #tag under the caret, unless Esc dismissed it.
  const tag = tagAtCaret(title, caret)
  // Not on a bare "#": a list of every project under the first keystroke is
  // noise, and "#" on its own is often just a character.
  const suggestions = tag && tag.query !== '' && dismissedTagAt !== tag.start ? suggestProjects(tag.query, live) : []
  const listOpen = suggestions.length > 0
  const highlighted = Math.min(active, Math.max(suggestions.length - 1, 0))

  // A tag typed in full and not picked from the list resolves on save by the
  // same rules the LINE bot uses. A typed tag wins over the chip: it is the
  // later, more specific instruction.
  const typed = extractTag(title)
  const typedMatch = typed.token ? matchTag(typed.token, live) : null
  const tagProject = typedMatch?.kind === 'FOUND' ? typedMatch.project : undefined
  const effectiveProject = tagProject ?? chosen
  const parseText = tagProject ? typed.remainder : title.trim()

  const settledText = useDebounced(parseText, 300)
  const preview = useQuery({ ...quickParseQuery(settledText), enabled: settledText !== '' && !dueAt })
  const reading = settledText === parseText ? preview.data ?? null : null
  const parsedDue = usableDue(reading, ignoredDue)
  const effectiveDue = dueAt ? new Date(dueAt).toISOString() : parsedDue

  const reveal = (k: string) => setShown((s) => ({ ...s, [k]: true }))
  const close = () => ref.current?.close()

  const syncCaret = (el: HTMLInputElement) => setCaret(el.selectionStart ?? el.value.length)

  const pick = (p: Project) => {
    if (!tag) return
    const next = removeSpan(title, tag.start, tag.end)
    setTitle(next)
    setProjectId(p.id)
    setActive(0)
    const at = Math.min(tag.start, next.length)
    setCaret(at)
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(at, at))
  }

  const onTitleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!listOpen || !tag) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setNavigated(true)
      setActive((highlighted + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setNavigated(true)
      setActive((highlighted - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Tab' || (e.key === 'Enter' && navigated)) {
      e.preventDefault()
      pick(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      // Closes the list, not the sheet.
      e.preventDefault()
      setDismissedTagAt(tag.start)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    let finalTitle = title.trim()
    let finalProject = chosen?.id
    if (typed.token && typedMatch) {
      if (typedMatch.kind === 'FOUND') {
        finalProject = typedMatch.project.id
        finalTitle = typed.remainder
      } else if (typedMatch.kind === 'AMBIGUOUS') {
        setError(`#${typed.token} ตรงกับหลายโปรเจกต์ (${typedMatch.names.join(', ')}) พิมพ์ชื่อให้ครบหรือเลือกจากรายการ`)
        return
      }
      // NOT_FOUND: the summary row already said so; the text stays in the title.
    }
    if (!finalTitle) {
      setError('ใส่ชื่องานก่อน')
      return
    }

    let finalDue = dueAt ? new Date(dueAt).toISOString() : null
    if (!finalDue) {
      setSubmitting(true)
      // The same query the preview runs, so this is normally a cache hit; when
      // the last keystroke beat the debounce it is read fresh, never guessed.
      const parsed = await qc.fetchQuery(quickParseQuery(finalTitle)).catch(() => null)
      setSubmitting(false)
      const due = usableDue(parsed, ignoredDue)
      if (parsed && due) {
        finalDue = due
        finalTitle = parsed.title
      }
    }

    create.mutate(
      {
        title: finalTitle,
        // datetime-local has no zone. It is wall-clock time in the user's own
        // timezone, which is exactly what they meant, so let Date resolve it.
        dueAt: finalDue,
        projectId: finalProject,
        priority: priority || undefined,
        requester: requester.trim() || undefined,
      },
      {
        onSuccess: (task) => {
          writeLastProject(finalProject)
          close()
          toast({
            // A deadline or a project takes it out of the inbox (server rule).
            title: finalDue || finalProject ? 'เพิ่มงานแล้ว' : 'เพิ่มงานเข้ากล่องรับงานแล้ว',
            body: task.project ? `${task.title} · ${task.project.name}` : task.title,
            // The one field that decides whether this task ever reminds anyone.
            action: finalDue
              ? undefined
              : { label: 'ใส่กำหนดส่ง', onAct: () => navigate(finalProject ? `/app/tasks/${task.id}` : '/app/inbox') },
          })
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  const busy = create.isPending || submitting
  const summary = effectiveDue || effectiveProject || (typedMatch && typedMatch.kind !== 'FOUND') || (!dueAt && reading && reading.reason !== 'NONE' && reading.reason !== 'MISSING_TITLE')

  return (
    <dialog
      ref={ref}
      onClose={onClosed}
      aria-label="เพิ่มงาน"
      className="
        m-0 w-full max-w-none bg-transparent p-0 backdrop:bg-ink/35
        mt-auto ml-0
        sm:m-auto sm:w-[420px]
      "
    >
      <form
        onSubmit={submit}
        className="rounded-t-[14px] border border-rule bg-sheet px-5 pt-3 pb-5 sm:rounded-sheet"
      >
        {/* Grab handle. Mobile only — on a desktop dialog it would be a lie. */}
        <div className="mx-auto h-1 w-[38px] rounded-pill bg-rule sm:hidden" aria-hidden />

        <h2 className="mt-5 font-display text-[20px] leading-[1.3] font-medium sm:mt-1">เพิ่มงาน</h2>
        <p className="mt-1.5 text-[12px] text-ink-2">
          พิมพ์ชื่องานแล้วกดเพิ่มได้เลย ใส่วันเวลาหรือ #โปรเจกต์ ในชื่อได้ด้วย
        </p>

        <div className="relative mt-[18px]">
          <input
            ref={inputRef}
            autoFocus
            value={title}
            maxLength={255}
            onChange={(e) => {
              setTitle(e.target.value)
              syncCaret(e.target)
              setActive(0)
              setNavigated(false)
              setDismissedTagAt(null)
              if (error) setError(null)
            }}
            onSelect={(e) => syncCaret(e.currentTarget)}
            onKeyDown={onTitleKey}
            placeholder="เช่น โทรกลับลูกค้า พรุ่งนี้ 10 โมง #งานขาย"
            aria-label="ชื่องาน"
            aria-invalid={!!error}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listId}
            // Only once the person has moved into the list: before that nothing
            // is selected, and Enter adds the task rather than picking option 0.
            aria-activedescendant={listOpen && navigated ? `${listId}-${highlighted}` : undefined}
            className={`h-[49px] w-full rounded-control border bg-ground px-3.5 text-[15px] placeholder:text-ink-3 ${
              error ? 'border-error' : 'border-rule'
            }`}
          />
          {listOpen && (
            <ul
              id={listId}
              role="listbox"
              aria-label="เลือกโปรเจกต์"
              className="absolute inset-x-0 top-full z-10 mt-1 max-h-[220px] overflow-y-auto rounded-control border border-rule bg-sheet py-1 shadow-[0_6px_18px_rgb(0_0_0/0.08)]"
            >
              {suggestions.map((p, i) => (
                <li
                  key={p.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={navigated && i === highlighted}
                  // mousedown, not click: a click would blur the input first and
                  // the caret, and with it the tag being completed, would be lost.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(p)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 text-[13px] ${
                    navigated && i === highlighted ? 'bg-ink/[0.05] font-medium' : 'hover:bg-ink/[0.03]'
                  }`}
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${projectDot[p.color]}`} aria-hidden />
                  <span className="min-w-0 truncate">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="mt-1.5 text-[12px] text-error">{error}</p>}

        {/* What the title has been read as — v2, 433:1212. Shown before saving,
            so a phrase that was read wrongly is caught here and not in the list. */}
        {/* The live region is always in the DOM, so a screen reader announces
            the reading when it appears rather than missing the first one. */}
        <div aria-live="polite">
        {summary && (
          <dl className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
            {(effectiveDue || (!dueAt && reading && reading.reason !== 'NONE' && reading.reason !== 'MISSING_TITLE')) && (
              <div className="flex items-center gap-2">
                <dt className="text-ink-3">กำหนดส่ง</dt>
                <dd className="flex items-center gap-2">
                  {effectiveDue ? (
                    <>
                      <span className={`font-medium ${dueTone(effectiveDue)}`}>{dueLabel(effectiveDue)}</span>
                      {!dueAt && parsedDue && (
                        <button
                          type="button"
                          onClick={() => setIgnoredDue(parsedDue)}
                          className="rounded-control px-1 text-ink-3 underline-offset-2 hover:underline"
                        >
                          ไม่ใช้
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-ink-2">{reading ? readingNote(reading) : null}</span>
                  )}
                </dd>
              </div>
            )}
            {effectiveProject && (
              <div className="flex items-center gap-2">
                <dt className="text-ink-3">โปรเจกต์</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <span className={`size-1.5 rounded-full ${projectDot[effectiveProject.color]}`} aria-hidden />
                  {effectiveProject.name}
                </dd>
              </div>
            )}
            {/* Said even when a project is already chosen: otherwise "#ขายส่ง"
                typed against a list without it would look filed and is not. */}
            {typedMatch && typedMatch.kind !== 'FOUND' && !listOpen && (
              <div className="flex items-center gap-2">
                <dt className="text-ink-3">แท็ก</dt>
                <dd className="text-ink-2">
                  {typedMatch.kind === 'AMBIGUOUS'
                    ? `#${typedMatch.token} ตรงหลายโปรเจกต์ · พิมพ์ชื่อให้ครบ`
                    : `ไม่พบโปรเจกต์ #${typedMatch.token} · เก็บเป็นข้อความในชื่องาน`}
                </dd>
              </div>
            )}
          </dl>
        )}
        </div>

        <p className="t-label mt-3.5 text-ink-3">ไม่บังคับ — แตะเพื่อเติมตอนนี้</p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {!shown.due && <Chip onClick={() => reveal('due')}>+ กำหนดส่ง</Chip>}
          {!shown.project && !chosen && <Chip onClick={() => reveal('project')}>+ โปรเจกต์</Chip>}
          {!shown.priority && <Chip onClick={() => reveal('priority')}>+ ความสำคัญ</Chip>}
          {!shown.requester && <Chip onClick={() => reveal('requester')}>+ ผู้สั่ง</Chip>}
        </div>

        {(shown.due || shown.project || chosen || shown.priority || shown.requester) && (
          <div className="mt-3 space-y-2.5">
            {shown.due && (
              <Field label="กำหนดส่ง">
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="h-[33px] w-full rounded-control border border-rule bg-ground px-2.5 font-mono text-[12px]"
                />
              </Field>
            )}
            {(shown.project || chosen) && (
              <Field label="โปรเจกต์">
                <div className="flex flex-wrap gap-2">
                  {live.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProjectId(projectId === p.id ? '' : p.id)}
                      aria-pressed={projectId === p.id}
                      className={`wc-lift flex items-center gap-2 rounded-control border px-3 py-1.5 text-[12px] ${
                        projectId === p.id ? 'border-ink bg-ink/[0.04] font-medium' : 'border-rule'
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${projectDot[p.color]}`} aria-hidden />
                      {p.name}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            {shown.priority && (
              <Field label="ความสำคัญ">
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(priority === p.value ? '' : p.value)}
                      aria-pressed={priority === p.value}
                      className={`wc-lift rounded-control border px-3 py-1.5 text-[12px] ${
                        priority === p.value ? 'border-ink bg-ink/[0.04] font-medium' : 'border-rule'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            {shown.requester && (
              <Field label="ผู้สั่ง">
                <input
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  placeholder="เช่น คุณมานพ"
                  className="h-[33px] w-full rounded-control border border-rule bg-ground px-2.5 text-[12.5px] placeholder:text-ink-3"
                />
              </Field>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="wc-lift mt-[22px] h-[50px] w-full rounded-control bg-brand text-[14px] font-medium text-on-dark disabled:opacity-55"
        >
          {busy ? 'กำลังเพิ่ม…' : effectiveDue || effectiveProject ? 'เพิ่มงาน' : 'เพิ่มเข้ากล่องรับงาน'}
        </button>

        <p className="mt-3 text-[12px] leading-[1.45] text-ink-3">
          {effectiveDue
            ? 'ระบบจะเตือนผ่าน LINE ก่อนถึงกำหนด ตามที่ตั้งไว้ในหน้าตั้งค่า'
            : effectiveProject
              ? 'งานจะอยู่ในโปรเจกต์นี้ ใส่กำหนดส่งเมื่อพร้อม'
              : 'งานใหม่จะอยู่ในกล่องรับงาน ถ้าค้างเกิน 24 ชั่วโมง ระบบจะสรุปส่งทาง LINE วันละครั้งตอน 09:00'}
        </p>

        <button
          type="button"
          onClick={close}
          className="wc-lift mt-2 h-9 w-full rounded-control text-[12.5px] text-ink-2"
        >
          ยกเลิก
        </button>
      </form>
    </dialog>
  )
}

/**
 * A reading's deadline, when it may be applied as it stands: only a clear,
 * future reading (`NONE`), and not one the person has already waved away. An
 * ambiguous or past time is shown, never applied — the same rule the LINE draft
 * follows, so neither channel invents a deadline.
 */
function usableDue(reading: QuickParse | null, ignored: string | null): string | null {
  if (!reading || reading.reason !== 'NONE' || !reading.dueAt) return null
  return reading.dueAt === ignored ? null : reading.dueAt
}

/** Why a reading set no deadline, in the summary row's words. */
function readingNote(reading: QuickParse): string {
  switch (reading.reason) {
    case 'AMBIGUOUS_TIME': {
      const times = reading.candidates.map((c) => c.split(' เวลา ')[1] ?? c)
      return `อ่านได้หลายแบบ (${times.join(' / ')}) · เลือกเองที่ + กำหนดส่ง`
    }
    case 'RESOLVED_TIME_IN_PAST':
      return 'เวลาที่พิมพ์ผ่านมาแล้ว · ยังไม่ตั้งให้'
    case 'DATE_WITHOUT_TIME':
      return 'ได้วันแล้ว ใส่เวลาด้วย เช่น 10:00'
    default:
      return ''
  }
}

/** "พรุ่งนี้ 10:00" — the gutter's own phrasing, so the row reads like the list. */
function dueLabel(iso: string): string {
  return gutterLabel(asTask(iso))
}

function dueTone(iso: string): string {
  const state = timeStateOf(asTask(iso))
  return state === 'none' ? 'text-ink' : timeText[state]
}

function asTask(dueAt: string): Task {
  return { id: '', title: '', status: 'TODO', priority: 'MEDIUM', dueAt, createdAt: dueAt }
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wc-lift h-[33px] rounded-control border border-rule px-3 text-[12px] text-ink-2"
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="t-meta mb-1 block text-ink-3">{label}</span>
      {children}
    </label>
  )
}
