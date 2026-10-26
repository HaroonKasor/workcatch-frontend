import { Link, useLocation } from 'react-router-dom'
import { SiteContainer, SiteHeader } from '../components/SiteChrome'
import { useMe } from '../lib/api'

/**
 * Any path nothing else matches — Figma 475:2904 (390), 491:3781 (iPad).
 *
 * Shows the path that was asked for, so a person can see whether a link they
 * were sent was cut off. Both ways out are one tap: the front door, or today.
 */
export default function NotFound() {
  const me = useMe()
  const { pathname } = useLocation()
  return (
    <div className="wc-page-enter wc-scale flex min-h-viewport flex-col bg-ground text-ink">
      <SiteContainer>
        <SiteHeader signedIn={!!me.data} />
      </SiteContainer>
      <SiteContainer className="flex flex-1 flex-col pb-6 md:items-center md:justify-center md:pb-0 md:text-center">
        <main className="flex flex-1 flex-col justify-center md:flex-none">
          <p className="font-mono text-[56px] leading-none font-semibold text-ink-3">404</p>
          <h1 className="font-display mt-5 text-[28px] leading-[1.3] font-semibold">ไม่พบหน้านี้</h1>
          <p className="mt-3 font-mono text-[14px] break-all text-ink-3">{pathname}</p>
        </main>
        <div className="flex flex-col gap-3 md:mt-8 md:flex-row-reverse">
          <Link
            to="/app/dashboard"
            className="wc-lift flex h-[52px] items-center justify-center rounded-control bg-brand-strong px-6 text-[15px] font-medium text-white md:h-11"
          >
            ไปที่วันนี้
          </Link>
          <Link
            to="/"
            className="wc-lift flex h-[52px] items-center justify-center rounded-control border border-rule bg-sheet px-6 text-[15px] font-medium md:h-11"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </SiteContainer>
    </div>
  )
}
