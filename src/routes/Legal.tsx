import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SiteContainer, SiteFooter, SiteHeader } from '../components/SiteChrome'
import { LineMark } from '../components/LineMark'
import { useMe } from '../lib/api'
import { info, privacy, terms, type Block, type Inline, type LegalDoc } from '../lib/legal'
import { LINE_OA_ADD_FRIEND_URL, LINE_OA_ID } from '../lib/line'

/**
 * /terms — Figma 475:2343 (390), 491:3217 (iPad) · /privacy — 475:2273, 491:3146 ·
 * /contact — 475:2399, 491:3274.
 *
 * Phone and iPad share one layout: a phone gets the contents as a drop-down above
 * the text, an iPad gets it as a column beside the text. The contact details come
 * from lib/legal-info.json, so a changed email changes here too.
 */

export function Terms() {
  return <DocPage doc={terms} />
}

export function Privacy() {
  return <DocPage doc={privacy} />
}

// ------------------------------------------------------------------ layout

function PublicPage({ children, tone = 'bg-sheet' }: { children: React.ReactNode; tone?: string }) {
  const me = useMe()
  const { pathname, hash } = useLocation()

  // The footer links sit at the bottom of the page they are clicked from, and
  // the router keeps that scroll position. Open at the top — or at the section
  // a link asked for. Here rather than in each page, because one forgot it once.
  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className={`wc-page-enter wc-scale min-h-viewport text-ink ${tone}`}>
      <SiteContainer>
        <SiteHeader signedIn={!!me.data} />
      </SiteContainer>
      {children}
      <SiteFooter />
    </div>
  )
}

function BackHome({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex min-h-11 items-center gap-1 text-[13px] text-ink-2 hover:text-ink ${className}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      หน้าแรก
    </Link>
  )
}

function DocPage({ doc }: { doc: LegalDoc }) {
  const [active, setActive] = useState(doc.sections[0].id)

  // The contents column follows the reader: the section nearest the top is lit.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    doc.sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [doc])

  return (
    <PublicPage>
      <SiteContainer className="pt-2 pb-12 md:grid md:grid-cols-[180px_1fr] md:gap-x-10 md:pt-6 md:pb-16 xl:grid-cols-[200px_minmax(0,720px)] xl:gap-x-16">
        <aside className="hidden md:block">
          <div className="sticky top-6">
            <BackHome />
            <p className="mt-1 px-2.5 text-[13px] text-ink-3">ในหน้านี้</p>
            <nav aria-label="ในหน้านี้" className="mt-1.5">
              {doc.sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'true' : undefined}
                  className={`flex min-h-11 items-center rounded-control px-2.5 text-[13px] ${
                    active === s.id ? 'bg-selected font-medium text-ink' : 'text-ink-2 hover:bg-ground'
                  }`}
                >
                  {i + 1}. {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          <BackHome className="md:hidden" />
          <h1 className="font-display mt-1 text-[28px] leading-[1.25] font-semibold tracking-[-0.5px] md:mt-0 md:text-[34px]">
            {doc.title}
          </h1>
          <p className="mt-2 text-[13px] text-ink-3">
            มีผลตั้งแต่ <InlineText parts={[info.effectiveDate ?? { missing: 'วันที่มีผล' }]} />
            <span aria-hidden> · </span>
            ปรับปรุงล่าสุด {info.updatedDate}
          </p>

          <p className="mt-3 text-[15px] leading-[1.7] text-ink-2">{doc.lead}</p>

          <Contents doc={doc} />

          {doc.sections.map((s, n) => (
            <section key={s.id} id={s.id} className="mt-8 scroll-mt-6 first:mt-6 md:first:mt-8">
              <h2 className="font-display text-[20px] leading-[1.4] font-medium">{n + 1}. {s.title}</h2>
              <div className="mt-2.5 space-y-3">
                {s.blocks.map((b, i) => (
                  <DocBlock key={i} block={b} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </SiteContainer>
    </PublicPage>
  )
}

/** Phone only: the contents, folded away until asked for. */
function Contents({ doc }: { doc: LegalDoc }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 md:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between rounded-control border border-rule bg-sheet px-4 text-[14px]"
      >
        สารบัญ · {doc.sections.length} หัวข้อ
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={open ? 'rotate-180' : ''}>
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <nav aria-label="สารบัญ" className="mt-1 rounded-control border border-rule bg-sheet">
          {doc.sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center border-b border-rule-soft px-4 text-[14px] last:border-b-0"
            >
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- contact

export function Contact() {
  return (
    <PublicPage>
      <SiteContainer className="pt-2 pb-12 md:pt-6 md:pb-16">
        <BackHome />
        <div className="md:mt-2 md:grid md:grid-cols-[1fr_220px] md:items-start md:gap-10 xl:grid-cols-[1fr_260px]">
          <div className="md:order-1">
            <h1 className="font-display mt-1 text-[28px] leading-[1.25] font-semibold tracking-[-0.5px] md:mt-0 md:text-[34px]">
              ติดต่อเรา
            </h1>

            {/* Below the title on an iPad, below the QR card on a phone. */}
            <a
              href={LINE_OA_ADD_FRIEND_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="wc-lift mt-4 hidden h-[52px] w-full max-w-[300px] items-center justify-center gap-3 rounded-control bg-line text-[15px] font-semibold text-ink md:flex"
            >
              <LineMark className="size-[24px]" />
              <span aria-hidden className="h-6 w-px bg-ink/20" />
              เพิ่มเพื่อนใน LINE
            </a>
          </div>

          <section aria-label="LINE" className="mt-4 rounded-[12px] border border-rule-soft bg-sheet p-5 md:order-2 md:mt-0">
            <img
              src={info.lineQr}
              alt={`QR code สำหรับเพิ่มเพื่อน LINE ${LINE_OA_ID}`}
              width={168}
              height={168}
              className="mx-auto size-[168px]"
            />
            <p className="mt-2 text-center font-mono text-[15px] font-medium">{LINE_OA_ID}</p>
            <CopyButton text={LINE_OA_ID} what="LINE ID" label="คัดลอก ID" className="mt-3 w-full" />
          </section>

          <a
            href={LINE_OA_ADD_FRIEND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="wc-lift mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-control bg-line text-[15px] font-semibold text-ink md:hidden"
          >
            <LineMark className="size-[24px]" />
            <span aria-hidden className="h-6 w-px bg-ink/20" />
            เพิ่มเพื่อนใน LINE
          </a>

          <dl className="mt-4 md:order-1 md:col-start-1 md:row-start-2 md:mt-5">
            <div className="flex min-h-12 items-center justify-between gap-4 border-y border-rule-soft">
              <dt className="text-[14px] text-ink-3">อีเมล</dt>
              <dd className="min-w-0 truncate font-mono text-[14px]">
                <a href={`mailto:${info.supportEmail}`} className="hover:underline">{info.supportEmail}</a>
              </dd>
            </div>
          </dl>
        </div>
      </SiteContainer>
    </PublicPage>
  )
}

/**
 * Copies a contact value. The label says what happened for two seconds and is
 * announced, so a person who cannot see the button still hears that the copy
 * worked. A browser that refuses clipboard access gets told so.
 */
function CopyButton({ text, what, label, className = '' }: { text: string; what: string; label: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(t)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('done')
    } catch {
      setState('failed')
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`คัดลอก${what}`}
      className={`wc-lift flex min-h-11 items-center justify-center gap-2 rounded-control border border-rule bg-sheet px-3 text-[14px] font-medium text-ink ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
        <path d="M10.5 3.5v-.5a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" />
      </svg>
      <span aria-live="polite">
        {state === 'done' ? 'คัดลอกแล้ว' : state === 'failed' ? 'คัดลอกไม่ได้' : label}
      </span>
    </button>
  )
}

function DocBlock({ block }: { block: Block }) {
  if (block.kind === 'p') {
    return (
      <p className="text-[15px] leading-[1.8] text-ink-2">
        <InlineText parts={block.parts} />
      </p>
    )
  }
  if (block.kind === 'list') {
    return (
      <ul className="space-y-2">
        {block.items.map((parts, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.8] text-ink-2">
            <span aria-hidden className="mt-[13px] size-1 shrink-0 bg-ink-3" />
            <span className="min-w-0">
              <InlineText parts={parts} />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <dl className="border-t border-rule-soft">
      {block.rows.map((r) => (
        <div key={r.what} className="grid gap-0.5 border-b border-rule-soft py-3 md:grid-cols-[220px_1fr] md:gap-6">
          <dt className="text-[14px] font-medium">{r.what}</dt>
          <dd className="text-[13px] leading-[1.5] text-ink-3 md:text-[14px]">{r.why}</dd>
        </div>
      ))}
    </dl>
  )
}

function InlineText({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === 'string') return <span key={i}>{part}</span>
        if ('missing' in part) {
          return (
            <span key={i} className="font-medium text-time-soon-strong">
              [รอข้อมูล: {part.missing}]
            </span>
          )
        }
        const cls = 'text-ink underline underline-offset-2 hover:text-ink-2 break-words'
        if (part.href.startsWith('/')) return <Link key={i} to={part.href} className={cls}>{part.text}</Link>
        const external = part.href.startsWith('http')
        return (
          <a key={i} href={part.href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {part.text}
          </a>
        )
      })}
    </>
  )
}
