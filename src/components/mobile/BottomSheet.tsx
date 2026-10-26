import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

/**
 * The phone's sheet — Figma 457:16 (drag handle, title, content, one primary
 * action pinned to the bottom).
 *
 * Built on the native <dialog>, like Quick Add: showModal() brings the focus trap,
 * Esc, an inert page behind it and focus returning to whatever opened it, with no
 * home-grown focus code to get wrong. A tap on the scrim closes it, and so does
 * pulling the handle down. From `lg` up it becomes a centred dialog, which is
 * what the links sheet needs on a desktop.
 *
 * The footer is where the primary action goes; the body scrolls beneath it, so
 * the action never leaves the thumb however long the content is.
 */
export function BottomSheet({ open, onClose, title, aside, footer, children, label }: {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  /** Right of the title: a reference value, a "ล้าง", a close button. */
  aside?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  /** Accessible name when there is no visible title. */
  label?: string
}) {
  if (!open) return null
  return <Sheet onClose={onClose} title={title} aside={aside} footer={footer} label={label}>{children}</Sheet>
}

function Sheet({ onClose, title, aside, footer, children, label }: {
  onClose: () => void
  title?: React.ReactNode
  aside?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  label?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ y: number } | null>(null)
  const [dy, setDy] = useState(0)
  const [dragging, setDragging] = useState(false)

  const titleId = useId()

  // Open on mount, and on the way out hand focus back to whatever opened the
  // sheet — however it closed (an item, the scrim, a drag), because an item
  // usually unmounts the sheet before the dialog's own close can restore it.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const el = ref.current
    if (el && !el.open) el.showModal()
    return () => {
      if (el?.open) el.close()
      opener?.focus?.()
    }
  }, [])
  const name = typeof title === 'string' ? title : label

  const end = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    if (dy > 80) onClose()
    else setDy(0)
  }

  return (
    <dialog
      ref={ref}
      // React StrictMode (dev) mounts, cleans up and re-mounts this effect: the cleanup's
      // close() queues a stale `close` event that fires after showModal() ran again.
      // A dialog that is open by the time the event arrives was not really closed.
      onClose={() => { if (!ref.current?.open) onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      aria-label={name}
      aria-labelledby={!name && title ? titleId : undefined}
      className="m-0 mt-auto ml-0 max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/35 lg:m-auto lg:w-[420px]"
    >
      <div
        className="flex max-h-[92dvh] flex-col rounded-t-[14px] border border-rule bg-sheet lg:rounded-sheet"
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dragging ? 'none' : 'transform 160ms ease-out' }}
      >
        {/* The handle is the drag target; its box is tall enough to grab. */}
        <div
          className="flex h-6 shrink-0 cursor-grab touch-none items-end justify-center pb-1.5 lg:hidden"
          onPointerDown={(e) => { drag.current = { y: e.clientY }; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerMove={(e) => { if (drag.current) setDy(Math.max(0, e.clientY - drag.current.y)) }}
          onPointerUp={end}
          onPointerCancel={end}
          aria-hidden
        >
          <span className="h-1 w-10 rounded-pill bg-rule" />
        </div>

        {(title || aside) && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1.5 pb-3 lg:pt-4">
            {title && <h2 id={titleId} className="font-display min-w-0 text-[20px] leading-[1.3] font-medium">{title}</h2>}
            {aside}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="shrink-0 px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            {footer}
          </div>
        )}
        {!footer && <div className="shrink-0" style={{ height: 'calc(env(safe-area-inset-bottom) + 8px)' }} />}
      </div>
    </dialog>
  )
}

/** A full-width 52px row of a sheet menu: icon, word, optional trailing value. */
export function SheetItem({ icon, children, trailing, tone, onClick, to, chevron }: {
  icon?: IconName
  children: React.ReactNode
  trailing?: React.ReactNode
  tone?: 'late' | 'error'
  onClick?: () => void
  to?: string
  chevron?: boolean
}) {
  const body = (
    <>
      {icon && <Icon name={icon} size={22} className={tone ? 'text-time-late' : 'text-ink'} />}
      <span className={`min-w-0 flex-1 text-left text-[16px] ${tone ? 'text-time-late' : ''}`}>{children}</span>
      {trailing && <span className="shrink-0 text-[14px] text-ink-3">{trailing}</span>}
      {chevron && <Icon name="chevronRight" size={18} className="text-ink-3" />}
    </>
  )
  const cls = 'flex min-h-[52px] w-full items-center gap-3.5 border-t border-rule-soft px-4 first:border-t-0 active:bg-ink/[0.04]'
  return to ? (
    <Link to={to} onClick={onClick} className={cls}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  )
}
