import { useEffect, useRef } from 'react'

/**
 * Confirmation — Figma node 82:2 ("Dialog/ลบงาน").
 *
 * Reserved for what undo cannot reach. The design's own note is that this screen
 * states the consequences BEFORE the press, which is why `consequences` is a
 * required-looking part of the shape rather than an optional flourish: a confirm
 * dialog that only asks "are you sure?" adds a click and no information, and
 * people learn to click through it without reading.
 *
 * Wording follows the same rule as the design: soft delete for 30 days is
 * described as recoverable, never as permanent, because saying "ลบถาวร" when it
 * is not teaches people to distrust the next warning.
 */
export function ConfirmDialog({
  open,
  title,
  subject,
  body,
  consequences,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  subject?: string
  body: string
  consequences?: string[]
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="confirm-title"
      className="m-auto w-[348px] max-w-[calc(100vw-40px)] rounded-[10px] border border-rule bg-sheet p-0 shadow-[0_2px_4px_rgba(23,23,23,0.06),0_16px_40px_rgba(23,23,23,0.16)] backdrop:bg-ink/35"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="font-display text-[17px] leading-[1.3] font-medium">
          {title}
        </h2>
        {subject && <p className="mt-[5px] truncate text-[12px] text-ink-2">{subject}</p>}
        <p className="mt-3.5 text-[12.5px] leading-[1.45] text-ink-2">{body}</p>

        {consequences && consequences.length > 0 && (
          <div className="mt-4.5 rounded-sheet border border-rule bg-ground px-3.5 py-3">
            <p className="t-label text-ink-3">สิ่งที่จะเกิดขึ้นด้วย</p>
            {consequences.map((c) => (
              <p key={c} className="mt-1.5 font-mono text-[12px] leading-[1.45] text-ink-2">
                {c}
              </p>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="wc-lift h-11 flex-1 rounded-control border border-rule text-[13px] font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`wc-lift h-11 flex-1 rounded-control text-[13px] font-medium ${
              destructive ? 'bg-error text-white' : 'bg-ink text-on-dark'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
