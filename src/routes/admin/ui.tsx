import type { ReactNode } from 'react'

/**
 * The few pieces every admin page shares. Under 900px a page is full-bleed lists
 * under a title that opens the page switcher (the layout owns that title); from
 * 900px it is the title in the page plus bordered tables.
 */

/** A page's own title. Below 900px the layout's switcher is the title instead. */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="t-page-title max-[899px]:hidden">{children}</h1>
}

/** A list or table: edge to edge under 900px, a bordered sheet from there up. */
export const LIST = 'border-y border-rule bg-sheet min-[900px]:rounded-sheet min-[900px]:border'

/** The small label above a list. */
export function ListLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`px-4 pt-5 pb-2 text-[13px] text-ink-2 min-[900px]:px-0 min-[900px]:pt-0 ${className}`}>{children}</h2>
}

export function Pills<T extends string>({ items, value, onChange }: {
  items: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 min-[900px]:flex-wrap min-[900px]:px-0 min-[900px]:pb-0">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={value === item.key}
          onClick={() => onChange(item.key)}
          className={`wc-lift min-h-11 shrink-0 rounded-pill px-4 text-[14px] min-[900px]:text-[13px] ${
            value === item.key ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function RetryButton({ label, disabled, onClick, className = '' }: {
  label: string
  disabled?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`wc-lift inline-flex min-h-11 items-center gap-2 rounded-control border border-rule bg-sheet px-3.5 text-[14px] font-medium disabled:text-ink-3 disabled:opacity-45 min-[900px]:text-[13px] ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3" />
      </svg>
      {label}
    </button>
  )
}
