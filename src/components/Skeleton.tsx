/**
 * Loading placeholders.
 *
 * The rule this file exists to enforce: a skeleton must be the SHAPE of the
 * thing that is coming, not a generic grey rectangle. If the placeholder rows
 * are 48px and the real rows are 62px, the page jumps the moment data lands and
 * the reader loses their place — which is the failure a skeleton was supposed to
 * prevent in the first place. So the primitives below take the same heights and
 * the same column positions as the components they stand in for.
 *
 * The wash and the pulse live in index.css as `.wc-skeleton`, which drops the
 * animation under `prefers-reduced-motion` and leaves a static block.
 */

/** One block of placeholder. `w`/`h` are raw CSS lengths, so they can mirror a measured row. */
export function Skeleton({ w, h = '12px', className = '' }: {
  w?: string
  h?: string
  className?: string
}) {
  return <div className={`wc-skeleton ${className}`} style={{ width: w, height: h }} aria-hidden />
}

/**
 * The eyebrow / title / standfirst stack that opens every screen in this app.
 * Sized off the real type ramp: t-caption is ~15px tall, t-page-title ~42px.
 */
export function SkeletonPageHeader({ standfirst = false }: { standfirst?: boolean }) {
  return (
    <>
      <Skeleton w="96px" h="11px" />
      <Skeleton w="248px" h="36px" className="mt-2.5" />
      {standfirst && <Skeleton w="min(520px, 80%)" h="13px" className="mt-3.5" />}
    </>
  )
}

/**
 * A sheet of task-shaped rows. `h-row` is the same 48px token TaskRow uses, so
 * the sheet is exactly as tall as the list that replaces it.
 */
export function SkeletonRows({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-sheet border border-rule bg-sheet ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`flex h-row items-center gap-4 px-5 ${i === rows - 1 ? '' : 'border-b border-rule-soft'}`}
        >
          <Skeleton w="56px" h="10px" />
          {/* Descending widths, because a column of identical bars reads as a
              loading bar rather than as a list of titles. */}
          <Skeleton w={`${240 - i * 22}px`} h="12px" />
        </div>
      ))}
    </div>
  )
}

/** A sheet-shaped card placeholder, for the grid screens (notes, projects). */
export function SkeletonCard({ h = '196px', className = '' }: { h?: string; className?: string }) {
  return (
    <div
      className={`rounded-sheet border border-rule bg-sheet p-5 ${className}`}
      style={{ height: h }}
      aria-hidden
    >
      <Skeleton w="72px" h="9px" />
      <Skeleton w="min(220px, 70%)" h="20px" className="mt-3.5" />
      <Skeleton w="100%" h="12px" className="mt-4" />
      <Skeleton w="82%" h="12px" className="mt-2.5" />
      <Skeleton w="60%" h="12px" className="mt-2.5" />
    </div>
  )
}

/**
 * Wrapper that announces the wait to a screen reader, which cannot see the
 * grey blocks at all. Everything inside is aria-hidden, so this is the one
 * place the loading state is spoken.
 */
export function SkeletonScreen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
