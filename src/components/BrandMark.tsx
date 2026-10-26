/**
 * The WorkCatch mark (Figma 440:2247): a catching cup in brand green holding a
 * task square. The square takes the current text colour, so the same mark works
 * on the light sheet and on the dark login panel.
 */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4.5 5.25V12.75C4.5 14.7391 5.29018 16.6468 6.6967 18.0533C8.10322 19.4598 10.0109 20.25 12 20.25C13.9891 20.25 15.8968 19.4598 17.3033 18.0533C18.7098 16.6468 19.5 14.7391 19.5 12.75V5.25"
        stroke="#0A8F5A"
        strokeWidth={3.375}
      />
      <path d="M14.625 7.5H9.375V12.75H14.625V7.5Z" fill="currentColor" />
    </svg>
  )
}
