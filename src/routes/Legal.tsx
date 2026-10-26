import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LineMark } from '../components/LineMark'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import { useMe } from '../lib/api'
import {
  contactChannels, contactFacts, contactLead, info, privacy, terms,
  type Block, type Inline, type LegalDoc,
} from '../lib/legal'

/**
 * /terms — Figma 292:1820 · /privacy — 292:1729 · /contact — 292:1879, and the
 * 390px versions beside them.
 *
 * The words and the facts come from lib/legal.ts and lib/legal-info.json. This
 * file only lays them out, so a fact changes in one place and every page, card
 * and footer that states it changes with it.
 *
 * A value the owner has not supplied renders as "[รอข้อมูล: …]" in plain sight.
 * It never reaches the public site: scripts/check-legal.mjs refuses the release
 * build while any of them is still null.
 */

export function Terms() {
  return <LegalPage doc={terms} />
}

export function Privacy() {
  return <LegalPage doc={privacy} />
}

export function Contact() {
  const help = contactChannels[0]
  return (
    <PublicPage>
      <main className="mx-auto max-w-[1120px] pt-6 pb-4 lg:pt-10">
        <BackHome />
        <p className="mt-6 text-[13px] leading-[1.5] text-ink-3 lg:mt-8">ติดต่อเรา</p>
        <h1 className="font-display mt-3 text-[30px] leading-[1.25] font-semibold tracking-[-0.5px] lg:text-[40px] lg:tracking-[-0.8px]">
          ติดต่อ
        </h1>
        <p className="mt-3 max-w-[720px] text-[15px] leading-[1.6] text-ink-3">{contactLead}</p>

        {/* One way in, with the QR beside it — Figma 292:1879 / 337:1729. */}
        <section
          aria-labelledby="contact-help"
          className="mt-8 flex flex-col gap-6 rounded-sheet border border-rule-soft bg-sheet p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-7"
        >
          <div className="min-w-0">
            <h2 id="contact-help" className="font-display text-[20px] leading-[1.4] font-medium">{help.title}</h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{help.body}</p>
            <div className="mt-6 space-y-2.5 lg:max-w-[320px]">
              <ChannelAction label={help.action.label} href={help.action.href} line />
              {help.secondary && (
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 text-[14px] leading-[1.6] text-ink-3">
                    <InlineText parts={help.secondary} />
                  </p>
                  {help.copy && <CopyButton text={help.copy.text} what={help.copy.what} />}
                </div>
              )}
            </div>
          </div>
          {/* Desktop only. Nobody scans a QR code on the screen they are
              holding; on a phone the button above is the link. */}
          <figure className="hidden shrink-0 flex-col gap-2.5 lg:flex">
            <img
              src={info.lineQr}
              alt={`QR code สำหรับเพิ่มเพื่อน LINE ID ${info.lineId}`}
              width={168}
              height={168}
              className="size-[168px]"
            />
            <figcaption className="text-[13px] leading-[1.5] text-ink-3">
              สแกนเพื่อเพิ่มเพื่อนใน LINE
              <a
                href={info.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-[15px] font-medium text-ink underline underline-offset-2"
              >
                LINE ID {info.lineId}
              </a>
            </figcaption>
          </figure>
        </section>

        <section
          aria-labelledby="contact-facts"
          className="mt-6 rounded-sheet border border-rule-soft px-5 py-2 lg:p-7"
        >
          <div className="min-w-0">
            <h2 id="contact-facts" className="font-display pt-3 text-[20px] leading-[1.4] font-medium lg:pt-0">
              ข้อมูลติดต่อ
            </h2>
            <dl className="mt-1">
              {contactFacts.map((f, i) => (
                <div
                  key={f.label}
                  className={`grid grid-cols-[88px_1fr] gap-4 py-3 lg:grid-cols-[140px_1fr] ${
                    i < contactFacts.length - 1 ? 'border-b border-rule-soft' : ''
                  }`}
                >
                  <dt className="text-[13px] leading-[1.7] text-ink-3">{f.label}</dt>
                  {/* 14px on a phone so an email address fits one line; it was
                      breaking as "gmail.co / m". */}
                  <dd className="flex min-w-0 items-center gap-3 text-[14px] leading-[1.6] lg:text-[15px]">
                    <span className="min-w-0 flex-1 break-words">
                      <InlineText parts={[f.value]} />
                    </span>
                    {/* Desktop only: on a phone the button beside it would push
                        the address onto two lines, and the card above already
                        offers the same copy. */}
                    {f.copy && <CopyButton text={f.copy} what={f.label} className="hidden lg:inline-flex" />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </PublicPage>
  )
}

// ------------------------------------------------------------------ layout

function PublicPage({ children }: { children: React.ReactNode }) {
  const me = useMe()
  const { pathname, hash } = useLocation()

  // The footer links sit at the bottom of the page they are clicked from, and
  // the router keeps that scroll position. Open at the top — or at the section
  // a link asked for, such as /terms#deletion from the privacy policy. Here
  // rather than in each page, because the contact page forgot it once.
  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="wc-page-enter wc-scale min-h-viewport bg-sheet text-ink">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-10">
        <SiteHeader signedIn={!!me.data} />
        {children}
        <SiteFooter />
      </div>
    </div>
  )
}

function BackHome() {
  return (
    <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
      <span aria-hidden>‹</span>
      กลับหน้าแรก
    </Link>
  )
}

function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <PublicPage>
      <main className="mx-auto max-w-[720px] pt-6 pb-4 lg:pt-10">
        <BackHome />
        <p className="mt-6 text-[13px] leading-[1.5] text-ink-3 lg:mt-8">
          มีผลตั้งแต่ <InlineText parts={[info.effectiveDate ?? { missing: 'วันที่มีผล' }]} />
          <span aria-hidden> · </span>
          ปรับปรุงล่าสุด {info.updatedDate}
        </p>
        <h1 className="font-display mt-3 text-[30px] leading-[1.25] font-semibold tracking-[-0.5px] lg:text-[40px] lg:tracking-[-0.8px]">
          {doc.title}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-ink-3">{doc.lead}</p>

        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} className={`scroll-mt-6 ${i === 0 ? 'mt-10' : 'mt-8 lg:mt-10'}`}>
            <h2 className="font-display text-[20px] leading-[1.45] font-medium lg:text-[22px]">{s.title}</h2>
            <div className="mt-3.5 space-y-3.5">
              {s.blocks.map((b, j) => (
                <DocBlock key={j} block={b} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </PublicPage>
  )
}

// ------------------------------------------------------------------ blocks

function DocBlock({ block }: { block: Block }) {
  if (block.kind === 'p') {
    return (
      <p className="text-[15px] leading-[1.75] text-ink-2">
        <InlineText parts={block.parts} />
      </p>
    )
  }
  if (block.kind === 'list') {
    return (
      <ul className="space-y-2">
        {block.items.map((parts, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.75] text-ink-2">
            <span aria-hidden className="mt-[12px] size-1 shrink-0 bg-ink-3" />
            <span className="min-w-0">
              <InlineText parts={parts} />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  // What is kept, and what it is kept for. Two columns where there is room;
  // stacked on a phone, where 250px of label would leave the reason no space.
  return (
    <div className="overflow-hidden rounded-sheet border border-rule-soft">
      <div aria-hidden className="hidden grid-cols-[250px_1fr] gap-6 bg-ground px-[18px] py-2.5 text-[13px] text-ink-3 lg:grid">
        <span>ข้อมูล</span>
        <span>ใช้ทำอะไร</span>
      </div>
      <dl>
        {block.rows.map((r, i) => (
          <div
            key={r.what}
            className={`grid gap-1 px-4 py-3.5 lg:grid-cols-[250px_1fr] lg:gap-6 lg:px-[18px] ${
              i > 0 ? 'border-t border-rule-soft' : 'lg:border-t lg:border-rule-soft'
            }`}
          >
            <dt className="text-[15px] leading-[1.6] font-medium">{r.what}</dt>
            <dd className="text-[15px] leading-[1.6] text-ink-2">{r.why}</dd>
          </div>
        ))}
      </dl>
    </div>
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
        if (part.href.startsWith('/')) {
          return <Link key={i} to={part.href} className={cls}>{part.text}</Link>
        }
        const external = part.href.startsWith('http')
        return (
          <a
            key={i}
            href={part.href}
            className={cls}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {part.text}
          </a>
        )
      })}
    </>
  )
}

/**
 * Copies a contact value — Figma "คัดลอกอีเมล" on 292:1879 / 337:1729.
 *
 * The label says what happened for two seconds and is announced, so a person
 * who cannot see the button still hears that the copy worked. A browser that
 * refuses clipboard access gets told so rather than a silent nothing.
 */
function CopyButton({ text, what, className = 'inline-flex' }: { text: string; what: string; className?: string }) {
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
      className={`wc-lift min-h-11 shrink-0 items-center rounded-control border border-rule bg-sheet px-3 text-[13px] font-medium text-ink-2 ${className}`}
    >
      <span aria-live="polite">
        {state === 'done' ? 'คัดลอกแล้ว' : state === 'failed' ? 'คัดลอกไม่ได้' : 'คัดลอก'}
      </span>
    </button>
  )
}

function ChannelAction({ label, href, line }: { label: string; href: string; line: boolean }) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`wc-lift flex h-12 w-full items-center justify-center gap-2.5 rounded-control px-4 text-[15px] ${
        line ? 'bg-line font-semibold text-ink' : 'bg-ink font-medium text-on-dark'
      }`}
    >
      {line && <LineMark className="size-[22px]" />}
      {label}
    </a>
  )
}
