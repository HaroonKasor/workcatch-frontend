import { useEffect, useId, useRef, useState } from 'react'

/**
 * A filter pill that opens its own list — Figma v2 423:747's สถานะ / โปรเจกต์ /
 * ความสำคัญ / ที่มา. Replaces the native <select>, whose option list is drawn
 * by the operating system and ignores the product's type, colour and spacing.
 *
 * A set filter inverts to ink, the same mark ทั้งหมด carries, so "this list is
 * filtered" reads without reading the labels; the chosen value replaces the
 * pill's name. Keyboard: Enter/Space/↓ opens, ↑↓ move, Enter picks, Esc closes.
 */
export function FilterMenu({ name, value, options, onChange }: {
  name: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const all = [{ value: '', label: `ทุก${name}` }, ...options]
  const chosen = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    button.current?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setActive(Math.max(0, all.findIndex((o) => o.value === value)))
      setOpen(true)
    } else if (open && e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((active + 1) % all.length)
    } else if (open && e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((active - 1 + all.length) % all.length)
    } else if (open && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      pick(all[active].value)
    } else if (open && (e.key === 'Escape' || e.key === 'Tab')) {
      if (e.key === 'Escape') e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={wrap} className="relative inline-flex">
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={chosen ? `${name}: ${chosen.label}` : name}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => {
          setActive(Math.max(0, all.findIndex((o) => o.value === value)))
          setOpen(!open)
        }}
        onKeyDown={onKey}
        className={[
          'wc-lift inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3.5 text-[12px] lg:min-h-[31px] lg:px-3',
          chosen ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2',
        ].join(' ')}
      >
        {chosen ? chosen.label : name}
        {chosen && <span aria-hidden className="text-[11px] opacity-70">▾</span>}
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={name}
          className="absolute top-full left-0 z-20 mt-1.5 max-h-72 min-w-[180px] overflow-y-auto rounded-control border border-rule bg-sheet py-1.5 shadow-[0_8px_28px_rgba(20,23,26,0.16)]"
        >
          {all.map((o, i) => (
            <li
              key={o.value || '__all'}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o.value)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 px-3.5 text-[13px] ${
                i === active ? 'bg-selected' : ''
              } ${o.value === value ? 'font-medium' : ''}`}
            >
              {o.label}
              {o.value === value && <span aria-hidden className="text-brand-strong">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
