import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark'

/**
 * The top bar and footer every public page shares — the landing page (Figma
 * 284:1638, 289:1729) and the three documents (292:1820, 292:1729, 292:1879 and
 * their 390px versions). One component, so a visitor moving between them sees
 * the same frame around a different page.
 */

const SITE_LINKS = [
  { to: '/terms', label: 'ข้อกำหนดการใช้บริการ' },
  { to: '/privacy', label: 'นโยบายความเป็นส่วนตัว' },
  { to: '/contact', label: 'ติดต่อ' },
]

const SECTIONS = [
  { hash: '#features', label: 'ทำอะไรได้' },
  { hash: '#how', label: 'วิธีใช้' },
  { hash: '#pricing', label: 'ราคา' },
]

/**
 * @param onLanding the section links scroll in place on the landing page and
 *        navigate back to it from anywhere else; the wordmark is a way home
 *        everywhere except on the page it would lead to.
 */
export function SiteHeader({ signedIn, onLanding = false }: { signedIn: boolean; onLanding?: boolean }) {
  const wordmark = (
    <div className="flex items-center gap-2.5">
      <BrandMark size={32} className="shrink-0 text-ink" />
      <div>
        <p className="t-wordmark">WorkCatch</p>
        <p className="t-meta mt-px hidden text-ink-3 lg:block">ไม่ให้งานหล่น</p>
      </div>
    </div>
  )
  return (
    <header className="flex items-center gap-3 pt-5 lg:pt-11">
      {onLanding ? <div>{wordmark}</div> : <Link to="/" aria-label="WorkCatch หน้าแรก">{wordmark}</Link>}
      <nav aria-label="ส่วนของหน้า" className="ml-auto hidden items-center gap-3 lg:flex">
        {SECTIONS.map((s) => (
          <a
            key={s.hash}
            href={onLanding ? s.hash : `/${s.hash}`}
            className="rounded-control px-2.5 py-2.5 text-[13px] text-ink-2 hover:bg-ground hover:text-ink"
          >
            {s.label}
          </a>
        ))}
      </nav>
      <Link
        to={signedIn ? '/app/dashboard' : '/login'}
        className="wc-lift ml-auto flex min-h-11 items-center rounded-control bg-ink px-4 text-[13px] font-medium text-on-dark lg:ml-0"
      >
        {signedIn ? 'เข้าแอป' : 'เข้าสู่ระบบ'}
      </Link>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-12 flex flex-col gap-1 pb-8 lg:mt-[72px] lg:flex-row lg:items-center lg:gap-4 lg:pb-14">
      <p className="text-[12px] text-ink-2 lg:flex lg:items-baseline lg:gap-4">
        <span className="font-display font-semibold text-ink lg:text-[16px]">WorkCatch</span>
        <span className="lg:hidden"> · </span>
        <span className="text-ink-3">ไม่ให้งานหล่น</span>
      </p>
      <nav aria-label="ข้อมูลบริการ" className="flex flex-wrap gap-x-4 lg:ml-auto">
        {SITE_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="py-2.5 text-[12px] text-ink-3 hover:text-ink">
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
