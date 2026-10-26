import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useMatch, useSearchParams } from 'react-router-dom'
import {
  AI_MAX_MESSAGES, ApiError, useAiChat, useAiStatus, useProjects, useTasks,
  type AiAction, type AiContext, type AiMessage,
} from '../lib/api'
import { clock } from '../lib/time'
import { AiActionList } from './AiActions'
import { AiPanelContext, shortcutLabel } from '../lib/aiPanel'
import { Skeleton } from './Skeleton'

/**
 * "ถาม AI" — Figma 445:2428 (open on the overview), 446:2424 (asking about a
 * task), 446:2731 / 2767 / 2803 / 2827 (answering, busy, switched off, history)
 * and 447:2557 (the phone's full-height sheet).
 *
 * A panel beside the work, not a page over it: on a desktop it slides in from
 * the right and the screen behind stays usable, because the questions are about
 * that screen. ⌘J / Ctrl+J or the rail button opens it; Esc closes it and hands
 * focus back to whatever had it.
 *
 * The conversation lives in this tab only (sessionStorage), at most twenty
 * messages — the contract sends the whole of it with each question, and keeps
 * none on the server.
 */

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  const open = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement
    setOpen(true)
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    // Back to where the person was, not to the top of the document.
    queueMicrotask(() => opener.current?.focus())
  }, [])
  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape' && isOpen && !document.querySelector('dialog[open]')) {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggle, close, isOpen])

  const api = useMemo(() => ({ open, close, toggle, isOpen }), [open, close, toggle, isOpen])
  return (
    <AiPanelContext.Provider value={api}>
      {children}
      <AiPanel open={isOpen} onClose={close} />
    </AiPanelContext.Provider>
  )
}

/* ------------------------------------------------------------ conversation -- */

interface ChatMessage extends AiMessage {
  at: string
  actions?: AiAction[]
}

interface Conversation {
  id: string
  startedAt: string
  /** "ภาพรวม", "งาน: …" — where it was asked, for the history list. */
  where: string
  messages: ChatMessage[]
}

interface Stored {
  current: Conversation | null
  history: Conversation[]
}

const STORE_KEY = 'wc.ai.chat'
const HISTORY_LIMIT = 10

function load(): Stored {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as Stored | null
    return parsed ?? { current: null, history: [] }
  } catch {
    return { current: null, history: [] }
  }
}

function save(stored: Stored) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(stored))
  } catch {
    // The conversation still works for as long as the tab stays open.
  }
}

/** At most twenty, oldest dropped first, and never starting on a reply. */
function capped(messages: ChatMessage[]): ChatMessage[] {
  let kept = messages.slice(-AI_MAX_MESSAGES)
  while (kept.length > 0 && kept[0].role !== 'user') kept = kept.slice(1)
  return kept
}

/* ----------------------------------------------------------------- context -- */

const ROUTE_LABELS: [RegExp, string, string][] = [
  [/^\/app\/dashboard/, 'dashboard', 'ภาพรวมวันนี้'],
  [/^\/app\/inbox/, 'inbox', 'กล่องรับงาน'],
  [/^\/app\/tasks\/?$/, 'tasks', 'รายการงาน'],
  [/^\/app\/board/, 'board', 'บอร์ด'],
  [/^\/app\/calendar/, 'calendar', 'ปฏิทิน'],
  [/^\/app\/projects/, 'projects', 'โปรเจกต์'],
  [/^\/app\/notes/, 'notes', 'บันทึก'],
  [/^\/app\/notifications/, 'notifications', 'ประวัติแจ้งเตือน'],
  [/^\/app\/settings/, 'settings', 'ตั้งค่า'],
]

interface PageContext {
  context: AiContext
  /** The chip: "หน้านี้: ภาพรวมวันนี้", "งานนี้: …". */
  chip: string
  kind: 'today' | 'task' | 'other'
}

function usePageContext(): PageContext {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const taskMatch = useMatch('/app/tasks/:id')
  const tasks = useTasks()
  const projects = useProjects()

  const taskId = taskMatch?.params.id ?? null
  if (taskId) {
    const title = tasks.data?.find((t) => t.id === taskId)?.title ?? 'งานที่เปิดอยู่'
    return { context: { route: 'task', taskId, projectId: null }, chip: `งานนี้: ${title}`, kind: 'task' }
  }
  const projectId = pathname.match(/^\/app\/projects\/([^/]+)$/)?.[1] ?? (pathname === '/app/tasks' ? params.get('project') : null)
  if (projectId) {
    const name = projects.data?.find((p) => p.id === projectId)?.name ?? 'โปรเจกต์นี้'
    return { context: { route: 'tasks', taskId: null, projectId }, chip: `โปรเจกต์นี้: ${name}`, kind: 'other' }
  }
  const hit = ROUTE_LABELS.find(([re]) => re.test(pathname))
  return {
    context: { route: hit?.[1] ?? 'app', taskId: null, projectId: null },
    chip: `หน้านี้: ${hit?.[2] ?? 'WorkCatch'}`,
    kind: hit?.[1] === 'dashboard' ? 'today' : 'other',
  }
}

const STARTERS: Record<PageContext['kind'], { heading: string; prompts: string[] }> = {
  today: {
    heading: 'ถามเกี่ยวกับวันนี้',
    prompts: ['อะไรเกินกำหนดบ้าง และควรเลื่อนไปเมื่อไร', 'จัดลำดับงานบ่ายนี้ให้หน่อย', 'งานไหนรอคนอื่นนานที่สุด'],
  },
  task: {
    heading: 'ถามเกี่ยวกับงานนี้',
    prompts: ['สรุปงานนี้ใน 3 บรรทัด', 'งานนี้มีความเสี่ยงช้าไหม', 'ใครเกี่ยวข้องกับงานนี้'],
  },
  other: {
    heading: 'ถามเกี่ยวกับงานของคุณ',
    prompts: ['อะไรเกินกำหนดบ้าง และควรเลื่อนไปเมื่อไร', 'สัปดาห์นี้มีงานอะไรครบกำหนดบ้าง', 'งานไหนรอคนอื่นนานที่สุด'],
  },
}

/* ------------------------------------------------------------------- panel -- */

type View = 'chat' | 'history'

function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const status = useAiStatus()
  const chat = useAiChat()
  const tasks = useTasks()
  const projects = useProjects()
  const page = usePageContext()
  const titleId = useId()

  const [stored, setStored] = useState<Stored>(load)
  const [view, setView] = useState<View>('chat')
  const [draft, setDraft] = useState('')
  // The page whose chip the person removed. A new page brings the chip back.
  const [droppedChip, setDroppedChip] = useState<string | null>(null)
  const useContextChip = droppedChip !== page.chip
  const [error, setError] = useState<ApiError | Error | null>(null)
  // Counts failures, so each one mounts a fresh ErrorBox: a second AI_BUSY
  // restarts its countdown instead of inheriting the first one's.
  const [errorSeq, setErrorSeq] = useState(0)
  const desktop = useIsDesktop()
  const sheet = useRef<HTMLElement>(null)

  // Below lg the panel is a full-height sheet over a scrim, so it behaves as a
  // modal: Tab cycles inside it and focus cannot wander to the page behind.
  // On a desktop it stays a non-modal panel beside the page, as designed.
  useEffect(() => {
    if (!open || desktop) return
    const focusables = () => [...(sheet.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])]
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const onFocusIn = (e: FocusEvent) => {
      if (sheet.current && !sheet.current.contains(e.target as Node) && !document.querySelector('dialog[open]')) {
        focusables()[0]?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open, desktop])
  const abort = useRef<AbortController | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const body = useRef<HTMLDivElement>(null)

  const commit = (next: Stored) => {
    setStored(next)
    save(next)
  }

  // Focus moves into the panel when it opens.
  useEffect(() => {
    if (open) queueMicrotask(() => input.current?.focus())
  }, [open])

  // The newest message in view.
  const messages = stored.current?.messages ?? []
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight })
  }, [messages.length, chat.isPending, error])

  const send = (text: string, base: ChatMessage[] = messages) => {
    const content = text.trim().slice(0, 2000)
    if (!content || chat.isPending) return
    const now = new Date().toISOString()
    const conversation: Conversation = stored.current ?? {
      id: `c_${now}`,
      startedAt: now,
      where: page.chip.replace(/^[^:]+:\s*/, ''),
      messages: [],
    }
    const nextMessages = capped([...base, { role: 'user', content, at: now }])
    commit({ ...stored, current: { ...conversation, messages: nextMessages } })
    setDraft('')
    setError(null)
    void ask(conversation, nextMessages)
  }

  const ask = async (conversation: Conversation, history: ChatMessage[]) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const context: AiContext = useContextChip ? page.context : { route: page.context.route, taskId: null, projectId: null }
    try {
      const result = await chat.mutateAsync({
        messages: history.map(({ role, content }) => ({ role, content })),
        context,
        signal: controller.signal,
      })
      const answered = capped([...history, { role: 'model', content: result.reply, actions: result.actions, at: new Date().toISOString() }])
      const next = { ...conversation, messages: answered }
      setStored((s) => {
        const stored2 = { ...s, current: next }
        save(stored2)
        return stored2
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e : new Error(String(e)))
      setErrorSeq((n) => n + 1)
    }
  }

  const stop = () => {
    abort.current?.abort()
    chat.reset()
  }

  const retry = () => {
    if (!stored.current) return
    setError(null)
    void ask(stored.current, stored.current.messages)
  }

  const newChat = () => {
    stop()
    setError(null)
    const history = stored.current && stored.current.messages.length > 0
      ? [stored.current, ...stored.history].slice(0, HISTORY_LIMIT)
      : stored.history
    commit({ current: null, history })
    setView('chat')
    queueMicrotask(() => input.current?.focus())
  }

  const reopen = (c: Conversation) => {
    stop()
    setError(null)
    const rest = stored.history.filter((h) => h.id !== c.id)
    const history = stored.current && stored.current.messages.length > 0 ? [stored.current, ...rest].slice(0, HISTORY_LIMIT) : rest
    commit({ current: c, history })
    setView('chat')
  }

  // What the panel is allowed to do right now.
  const code = error instanceof ApiError ? error.code : undefined
  const off = status.data && (!status.data.available || code === 'AI_UNAVAILABLE')
    ? 'unavailable'
    : status.data && (!status.data.enabled || code === 'AI_DISABLED')
      ? 'disabled'
      : code === 'AI_QUOTA' || (status.data && status.data.dailyLimit > 0 && status.data.usedToday >= status.data.dailyLimit)
        ? 'quota'
        : null
  const blocked = off !== null || code === 'AI_BUSY'

  return (
    <>
      {/* The phone's scrim. On a desktop the page behind stays live. */}
      {open && <div className="fixed inset-0 z-40 bg-ink/35 lg:hidden" aria-hidden onClick={onClose} />}
      <aside
        role="dialog"
        ref={sheet}
        aria-modal={open && !desktop}
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        className={`
          fixed z-50 flex flex-col bg-sheet transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none
          inset-x-0 bottom-0 top-11 rounded-t-[14px]
          lg:inset-x-auto lg:right-0 lg:top-0 lg:h-viewport lg:w-[420px] lg:rounded-none lg:border-l lg:border-rule lg:shadow-[-8px_0_24px_rgba(20,23,26,0.1)]
          ${open ? 'visible translate-y-0 lg:translate-x-0' : 'invisible translate-y-full lg:translate-y-0 lg:translate-x-full'}
        `}
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-pill bg-rule lg:hidden" aria-hidden />
        <header className="flex shrink-0 items-center justify-between border-b border-rule-soft pt-4 pr-4 pb-3.5 pl-5">
          <h2 id={titleId} className="font-display text-[17px] font-medium leading-[1.3]">ถาม AI</h2>
          <div className="flex items-center gap-4 text-[13px] font-medium text-ink-2">
            <button type="button" onClick={() => setView(view === 'history' ? 'chat' : 'history')} aria-pressed={view === 'history'} className="min-h-9 hover:text-ink">
              ประวัติ
            </button>
            <button type="button" onClick={newChat} className="min-h-9 hover:text-ink">แชทใหม่</button>
            <button type="button" onClick={onClose} className="flex min-h-9 items-center gap-1.5 hover:text-ink">
              ปิด
              <kbd className="hidden rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2 lg:inline">Esc</kbd>
            </button>
          </div>
        </header>

        <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-5 py-[18px]">
          {view === 'history' ? (
            <History conversations={stored.history} current={stored.current} onOpen={reopen} />
          ) : off === 'unavailable' ? (
            <Notice title="ผู้ช่วย AI ยังไม่พร้อมใช้งาน" body="ผู้ดูแลระบบยังไม่ได้เปิดใช้ AI ส่วนอื่นของ WorkCatch ใช้ได้ตามปกติ" />
          ) : off === 'disabled' ? (
            <Notice
              title="ผู้ช่วย AI ปิดอยู่"
              body="เมื่อเปิดแล้ว ชื่องาน กำหนดส่ง และชื่อโปรเจกต์ของคุณจะถูกส่งไปที่ Google Gemini"
              action={<Link to="/app/settings#ai" onClick={onClose} className="wc-lift inline-flex min-h-9 items-center rounded-control bg-brand px-3.5 text-[13px] font-medium text-on-dark">ไปที่ตั้งค่า AI</Link>}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.length === 0 && (
                <Starters
                  kind={page.kind}
                  recent={stored.history.slice(0, 3)}
                  onAsk={(p) => send(p, [])}
                  onOpen={reopen}
                />
              )}
              {messages.map((m, i) => (
                <Message key={`${m.at}-${i}`} message={m} tasks={tasks.data ?? []} projects={projects.data ?? []} />
              ))}
              {chat.isPending && <Answering onStop={stop} />}
              {error && <ErrorBox key={errorSeq} error={error} resetsAt={status.data?.resetsAt} onRetry={retry} />}
              {off === 'quota' && !error && <QuotaBox resetsAt={status.data?.resetsAt} limit={status.data?.dailyLimit ?? 0} />}
            </div>
          )}
        </div>

        <Composer
          inputRef={input}
          draft={draft}
          onDraft={setDraft}
          onSend={() => send(draft)}
          chip={useContextChip && view === 'chat' && off !== 'disabled' && off !== 'unavailable' ? page.chip : null}
          onDropChip={() => setDroppedChip(page.chip)}
          disabled={blocked || chat.isPending}
          blockedReason={blocked ? 'ถามได้อีกครั้งเมื่อ AI พร้อม' : null}
        />
      </aside>
    </>
  )
}

/* -------------------------------------------------------------- pieces -- */

function Starters({ kind, recent, onAsk, onOpen }: {
  kind: PageContext['kind']
  recent: Conversation[]
  onAsk: (prompt: string) => void
  onOpen: (c: Conversation) => void
}) {
  const s = STARTERS[kind]
  return (
    <>
      <p className="text-[12px] font-medium text-ink-3">{s.heading}</p>
      {kind === 'task' ? (
        <div className="flex flex-wrap gap-2">
          {s.prompts.map((p) => (
            <button key={p} type="button" onClick={() => onAsk(p)} className="wc-lift min-h-9 rounded-control border border-rule bg-sheet px-2.5 text-[13px] text-ink-2">
              {p}
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-control border border-rule bg-sheet">
          {s.prompts.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => onAsk(p)}
              className={`block w-full px-3.5 py-[11px] text-left text-[14px] hover:bg-ink/[0.03] ${i < s.prompts.length - 1 ? 'border-b border-rule-soft' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <>
          <p className="mt-2.5 text-[12px] font-medium text-ink-3">แชทล่าสุด</p>
          {recent.map((c) => (
            <button key={c.id} type="button" onClick={() => onOpen(c)} className="flex w-full items-start justify-between gap-3 py-1 text-left hover:text-ink">
              <span className="min-w-0 truncate text-[13px] text-ink-2">{c.messages[0]?.content}</span>
              <span className="shrink-0 text-[12px] text-ink-3">{when(c.startedAt)}</span>
            </button>
          ))}
        </>
      )}
    </>
  )
}

function Message({ message, tasks, projects }: { message: ChatMessage; tasks: Parameters<typeof AiActionList>[0]['tasks']; projects: Parameters<typeof AiActionList>[0]['projects'] }) {
  const [copied, setCopied] = useState(false)
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-control bg-ground px-3 py-2 text-[14px] font-medium leading-[1.4]">{message.content}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-wrap text-[14px] leading-[1.65]">{message.content}</p>
      {message.actions && message.actions.length > 0 && (
        <AiActionList actions={message.actions} tasks={tasks} projects={projects} />
      )}
      <div className="flex gap-3.5 text-[12px] font-medium text-ink-2">
        <button
          type="button"
          className="min-h-[32px] hover:text-ink"
          onClick={() => {
            void navigator.clipboard?.writeText(message.content).then(() => setCopied(true), () => setCopied(false))
          }}
        >
          {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
        </button>
      </div>
    </div>
  )
}

function Answering({ onStop }: { onStop: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-ink-3">กำลังอ่านงานของคุณและเรียบเรียงคำตอบ</span>
        <button type="button" onClick={onStop} className="wc-lift min-h-9 rounded-control border border-rule bg-sheet px-3 text-[13px] font-medium">
          หยุด
        </button>
      </div>
      <Skeleton w="300px" h="10px" className="max-w-full" />
      <Skeleton w="240px" h="10px" className="max-w-full" />
    </div>
  )
}

/** Busy / failed: the reason, and the way back. Busy counts down to its retry. */
function ErrorBox({ error, resetsAt, onRetry }: { error: Error; resetsAt?: string; onRetry: () => void }) {
  const code = error instanceof ApiError ? error.code : undefined
  const retryAfter = error instanceof ApiError && typeof error.body?.retryAfterSeconds === 'number' ? error.body.retryAfterSeconds : 0
  const [until] = useState(() => Date.now() + retryAfter * 1000)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (code !== 'AI_BUSY') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [code])

  if (code === 'AI_QUOTA') {
    const at = typeof (error as ApiError).body?.resetsAt === 'string' ? ((error as ApiError).body!.resetsAt as string) : resetsAt
    return <QuotaBox resetsAt={at} />
  }
  if (code === 'AI_DISABLED' || code === 'AI_UNAVAILABLE') return null

  if (code === 'AI_BUSY') {
    const left = Math.max(0, Math.ceil((until - now) / 1000))
    const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
    return (
      <div role="status" className="rounded-control bg-time-soon-wash px-3.5 py-3">
        <p className="text-[14px] font-semibold text-time-soon-strong">AI ไม่ว่างชั่วคราว</p>
        <p className="mt-1 text-[13px] text-ink-2">
          {left > 0 ? `ลองใหม่ในอีก ${Math.max(1, Math.ceil(left / 60))} นาที` : 'ลองใหม่ได้แล้ว'} ระหว่างนี้ค้นหางานแบบปกติได้
        </p>
        <div className="mt-2 flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onRetry}
            disabled={left > 0}
            className={`min-h-9 rounded-control px-3 text-[13px] font-medium ${left > 0 ? 'bg-ground text-ink-3' : 'wc-lift border border-rule bg-sheet text-ink'}`}
          >
            {left > 0 ? `ลองใหม่ (${mm})` : 'ลองใหม่'}
          </button>
          <SearchButton />
        </div>
      </div>
    )
  }
  return (
    <div role="alert" className="rounded-control border border-error/35 bg-error/[0.06] px-3.5 py-3">
      <p className="text-[14px] font-semibold text-error">AI ตอบไม่สำเร็จ</p>
      <p className="mt-1 text-[13px] text-ink-2">
        {code === 'AI_FAILED'
          ? 'AI ตอบไม่ทันหรือขัดข้อง ครั้งนี้ไม่นับโควตา'
          : 'ต่อเซิร์ฟเวอร์ไม่ได้ เช็คอินเทอร์เน็ตแล้วลองใหม่'}
      </p>
      <button type="button" onClick={onRetry} className="wc-lift mt-2.5 min-h-9 rounded-control border border-rule bg-sheet px-3 text-[13px] font-medium">
        ลองใหม่
      </button>
    </div>
  )
}

function QuotaBox({ resetsAt, limit }: { resetsAt?: string; limit?: number }) {
  return (
    <div role="status" className="rounded-control bg-time-soon-wash px-3.5 py-3">
      <p className="text-[14px] font-semibold text-time-soon-strong">
        {limit ? `ใช้ครบ ${limit} คำถามของวันนี้แล้ว` : 'ใช้ครบโควตาของวันนี้แล้ว'}
      </p>
      <p className="mt-1 text-[13px] text-ink-2">
        {resetsAt ? `นับใหม่ ${clock(resetsAt)} น.` : 'นับใหม่ทุกเที่ยงคืน'} ระหว่างนี้ค้นหางานแบบปกติได้
      </p>
      <div className="mt-2 pt-1">
        <SearchButton />
      </div>
    </div>
  )
}

function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent('wc:open-search'))}
      className="wc-lift flex min-h-9 items-center gap-1.5 rounded-control border border-rule bg-sheet px-3 text-[13px] font-medium"
    >
      ค้นหาแบบปกติ
      <kbd className="rounded-[4px] border border-rule bg-ground px-1.5 py-px font-mono text-[11px] text-ink-2">{shortcutLabel('K')}</kbd>
    </button>
  )
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div>
      <p className="font-display text-[20px] font-medium leading-[1.3]">{title}</p>
      <p className="mt-2 text-[13px] leading-[1.5] text-ink-2">{body}</p>
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  )
}

function History({ conversations, current, onOpen }: {
  conversations: Conversation[]
  current: Conversation | null
  onOpen: (c: Conversation) => void
}) {
  const all = [...(current && current.messages.length > 0 ? [current] : []), ...conversations]
  if (all.length === 0) {
    return <p className="text-[13px] text-ink-3">ยังไม่มีแชทในแท็บนี้ · แชทเก็บไว้จนกว่าจะปิดแท็บ</p>
  }
  const groups = new Map<string, Conversation[]>()
  for (const c of all) {
    const g = dayGroup(c.startedAt)
    groups.set(g, [...(groups.get(g) ?? []), c])
  }
  return (
    <div className="flex flex-col gap-1">
      {[...groups.entries()].map(([label, items]) => (
        <section key={label}>
          <p className="pt-2 pb-1 text-[12px] font-medium text-ink-3">{label}</p>
          {items.map((c) => (
            <button key={c.id} type="button" onClick={() => onOpen(c)} className="block w-full border-b border-rule-soft py-3 text-left hover:bg-ink/[0.02]">
              <span className="block truncate text-[14px]">{c.messages[0]?.content}</span>
              <span className="mt-0.5 block truncate text-[12px] text-ink-3">ถามจาก: {c.where}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}

function Composer({ inputRef, draft, onDraft, onSend, chip, onDropChip, disabled, blockedReason }: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  draft: string
  onDraft: (v: string) => void
  onSend: () => void
  chip: string | null
  onDropChip: () => void
  disabled: boolean
  blockedReason: string | null
}) {
  return (
    <div className="shrink-0 border-t border-rule-soft px-4 pt-3 pb-3.5" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSend()
        }}
        className={`flex flex-col gap-2 rounded-control border border-rule py-2.5 pr-2.5 pl-3 ${blockedReason ? 'bg-ground' : 'bg-sheet'}`}
      >
        {chip && (
          <span className="flex max-w-full items-center gap-1.5 self-start rounded-[4px] bg-ground py-0.5 pr-1.5 pl-2 text-[12px] text-ink-2">
            <span className="truncate">{chip}</span>
            <button type="button" onClick={onDropChip} aria-label="ไม่ส่งบริบทหน้านี้" className="text-[13px] text-ink-3 hover:text-ink">×</button>
          </span>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                onSend()
              }
            }}
            rows={1}
            maxLength={2000}
            disabled={disabled}
            placeholder={blockedReason ?? 'ถามเรื่องงานของคุณ'}
            aria-label="คำถามถึง AI"
            className="max-h-32 min-h-[24px] min-w-0 flex-1 resize-none bg-transparent text-[14px] leading-[1.4] placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            disabled={disabled || !draft.trim()}
            className={`min-h-9 shrink-0 rounded-control px-3 text-[13px] font-medium lg:hidden ${disabled ? 'bg-ground text-ink-3' : 'bg-brand text-on-dark disabled:opacity-55'}`}
          >
            ถาม
          </button>
        </div>
        <div className="hidden items-center justify-between lg:flex">
          <span className="text-[11.5px] text-ink-3">Enter ส่ง · Shift+Enter ขึ้นบรรทัด</span>
          <button
            type="submit"
            disabled={disabled || !draft.trim()}
            className={`min-h-[32px] rounded-control px-3 text-[13px] font-medium ${disabled ? 'bg-ground text-ink-3' : 'bg-brand text-on-dark disabled:opacity-55'}`}
          >
            ถาม
          </button>
        </div>
      </form>
      <p className="mt-2 text-[11.5px] text-ink-3">ตอบจากข้อมูลของคุณเท่านั้น · สร้างโดย AI ตรวจก่อนทำ</p>
    </div>
  )
}

/* ----------------------------------------------------------------- dates -- */

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
}

function dayGroup(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (dayKey(d) === dayKey(today)) return 'วันนี้'
  if (dayKey(d) === dayKey(yesterday)) return 'เมื่อวาน'
  return 'ก่อนหน้านี้'
}

function when(iso: string): string {
  const g = dayGroup(iso)
  return g === 'วันนี้' ? clock(iso) : g === 'เมื่อวาน' ? `เมื่อวาน ${clock(iso)}` : new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'long' }).format(new Date(iso)).replace('วัน', '')
}

/** lg and up: the panel sits beside the page instead of over it. */
function useIsDesktop(): boolean {
  const query = '(min-width: 64rem)'
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}
