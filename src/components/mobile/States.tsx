import { Icon, type IconName } from './Icon'
import { MobileHeader } from './MobileHeader'

/**
 * The three states every phone list has besides "has rows" — Figma 472:1933
 * (loading), 472:2097 (empty) and 472:2199 (error). Loading keeps the header and
 * draws rows at the height they will settle at; empty is one icon and one line;
 * an error is a red box with the reason in one line and a way to try again.
 */
export function MobileListSkeleton({ title, count, label }: { title: string; count?: number | string; label: string }) {
  return (
    <div className="lg:hidden" role="status" aria-busy="true" aria-label={label}>
      <MobileHeader title={title} count={count} />
      <div className="wc-skeleton mx-4 mt-3 mb-2 h-3 w-16 rounded-[2px]" />
      <div className="border-t border-rule bg-sheet">
        {[0.7, 0.55, 0.78, 0.5, 0.66, 0.74, 0.58].map((w, i) => (
          <div key={i} className="flex gap-3 border-b border-rule-soft px-4 py-3.5">
            <span className="wc-skeleton mt-1 h-3 w-[56px] shrink-0 rounded-[2px]" />
            <span className="min-w-0 flex-1">
              <span className="wc-skeleton block h-4 rounded-[2px]" style={{ width: `${w * 100}%` }} />
              <span className="wc-skeleton mt-2 block h-3 w-1/3 rounded-[2px]" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MobileEmpty({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 pt-[22vh] text-center text-ink-2">
      <Icon name={icon} size={28} />
      <p className="mt-3 text-[17px] font-medium">{children}</p>
    </div>
  )
}

export function MobileLoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-4 mt-3 rounded-control bg-error/[0.09] px-4 py-3.5">
      <p className="flex items-center gap-2 text-[16px] font-medium text-error">
        <Icon name="alert" size={20} />{title}
      </p>
      <p className="mt-1.5 text-[14px] text-ink-2">ต่อเซิร์ฟเวอร์ไม่ได้ เช็คอินเทอร์เน็ตแล้วลองใหม่</p>
      <button type="button" onClick={onRetry} className="wc-lift mt-3 flex min-h-11 items-center gap-2 rounded-control border border-rule bg-sheet px-4 text-[15px] font-medium">
        <Icon name="undo" size={18} />ลองใหม่
      </button>
    </div>
  )
}
