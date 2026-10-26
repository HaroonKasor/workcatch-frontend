import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Toasts — Figma node 84:2.
 *
 * The design note on that frame is the rule this follows: "ทุกการกระทำที่ย้อนกลับ
 * ได้ต้องมีปุ่มเลิกทำ ไม่ใช่ให้ยืนยันก่อนทุกครั้ง" — anything reversible gets an
 * undo afterwards rather than a confirmation beforehand. A confirm dialog taxes
 * every correct action to catch the rare wrong one; undo taxes only the mistake.
 *
 * So a toast is not decoration here. It is where the undo lives, which is why it
 * stays long enough to reach and does not disappear while the pointer is on it.
 */

export interface ToastAction {
  label: string
  onAct: () => void
}

export interface ToastInput {
  title: string
  body?: string
  action?: ToastAction
  tone?: 'normal' | 'error' | 'success'
}

interface Toast extends ToastInput {
  id: number
}

const Ctx = createContext<(t: ToastInput) => void>(() => {})

export function useToast() {
  return useContext(Ctx)
}

/** With an undo to reach for, six seconds is not enough and twelve is nagging. */
const LIFETIME_MS = 6_000
const LIFETIME_WITH_ACTION_MS = 9_000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((input: ToastInput) => {
    const id = ++seq.current
    // Three is where a stack stops being readable and starts being a wall.
    setToasts((list) => [...list, { ...input, id }].slice(-3))
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        // Polite, not assertive: a confirmation should not interrupt whatever a
        // screen reader is in the middle of saying.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-5 z-50 flex w-[min(396px,calc(100vw-40px))] flex-col gap-2 max-lg:bottom-[76px]"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastCard({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (held) return
    const ms = toast.action ? LIFETIME_WITH_ACTION_MS : LIFETIME_MS
    const id = setTimeout(onDone, ms)
    return () => clearTimeout(id)
  }, [held, toast.action, onDone])

  return (
    <div
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      className={`pointer-events-auto flex items-center gap-3 rounded-control border bg-sheet py-3.5 pr-[18px] pl-[18px] shadow-[0_1px_2px_rgba(23,23,23,0.06),0_8px_24px_rgba(23,23,23,0.10)] ${
        toast.tone === 'error'
          ? 'border-error/40'
          : toast.tone === 'success'
            ? 'border-brand/40'
            : 'border-rule'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-medium ${
            toast.tone === 'error' ? 'text-error' : toast.tone === 'success' ? 'text-brand-strong' : ''
          }`}
        >
          {/* The tone is said in a word as well as drawn in a colour. A reader
              who cannot separate the red from the green still gets the news. */}
          {toast.tone === 'error' && <span className="t-label mr-2">ผิดพลาด</span>}
          {toast.tone === 'success' && <span className="t-label mr-2">สำเร็จ</span>}
          {toast.title}
        </p>
        {toast.body && <p className="mt-0.5 truncate text-[12px] text-ink-2">{toast.body}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onAct()
            onDone()
          }}
          className="wc-lift h-8 shrink-0 rounded-[6px] border border-rule px-3 text-[12px] font-medium"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}
