import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark'

/**
 * The top bar and footer every public page shares — the landing page, the
 * three documents and the 404, on phone (390), iPad (820 / 1180) and desktop.
 * One component, so a visitor moving between them sees the same frame around a
 * different page.
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

/** The page column: 20px gutters on a phone, 48px on an iPad, 40px on desktop. */
export function SiteContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-5 md:px-12 xl:px-10 ${className}`}>{children}</div>
}

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
        <p className="t-meta mt-px hidden text-ink-3 xl:block">ไม่ให้งานหล่น</p>
      </div>
    </div>
  )
  return (
    <header className="flex items-center gap-3 pt-5 xl:pt-11">
      {onLanding ? <div>{wordmark}</div> : <Link to="/" aria-label="WorkCatch หน้าแรก" className="rounded-control">{wordmark}</Link>}
      <nav aria-label="ส่วนของหน้า" className="ml-auto hidden items-center gap-3 md:flex">
        {SECTIONS.map((s) => (
          <a
            key={s.hash}
            href={onLanding ? s.hash : `/${s.hash}`}
            className="flex min-h-11 items-center rounded-control px-2.5 text-[13px] text-ink-2 hover:bg-ground hover:text-ink"
          >
            {s.label}
          </a>
        ))}
      </nav>
      <Link
        to={signedIn ? '/app/dashboard' : '/login'}
        className="wc-lift ml-auto flex min-h-11 items-center rounded-control bg-ink px-4 text-[13px] font-medium text-on-dark md:ml-0"
      >
        {signedIn ? 'เข้าแอป' : 'เข้าสู่ระบบ'}
      </Link>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-rule-soft xl:mt-[72px] xl:border-t-0">
      <SiteContainer className="flex flex-col py-6 md:flex-row md:items-center md:gap-4 md:py-5 xl:pt-0 xl:pb-14">
        <p className="flex items-baseline gap-3 text-[13px] text-ink-3">
          <span className="font-display text-[15px] font-semibold text-ink xl:text-[16px]">WorkCatch</span>
          <span className="md:hidden xl:inline">ไม่ให้งานหล่น</span>
          <span className="hidden md:inline xl:hidden">© 2569</span>
        </p>
        <nav aria-label="ข้อมูลบริการ" className="mt-2 flex flex-col md:mt-0 md:ml-auto md:flex-row md:gap-6">
          {SITE_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="flex min-h-11 items-center text-[13px] text-ink-3 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-1 text-[13px] text-ink-3 md:hidden">© 2569 WorkCatch</p>
      </SiteContainer>
    </footer>
  )
}
