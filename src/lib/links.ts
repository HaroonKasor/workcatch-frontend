/**
 * Task links — contract backend/docs/links-api.md.
 *
 * Only http and https are ever turned into a link. The server is the real check;
 * this keeps the obvious refusals (javascript:, data:, a bare word) off the wire
 * and keeps a URL typed into a description from becoming a live anchor unless it
 * is safe.
 */

export const LINK_REL = 'noopener noreferrer nofollow'
export const MAX_LINKS = 30

/** The trimmed URL when it is a plain http(s) URL with a host and no userinfo, else null. */
export function safeHttpUrl(raw: string): string | null {
  const text = raw.trim()
  if (!text || text.length > 2048) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname || url.username || url.password) return null
  return text
}

/** The host in the form the browser (and so the server's punycode) would show. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export type Piece = { text: string; href?: string }

const URL_RE = /https?:\/\/[^\s<>"']+/gi
/** Punctuation that belongs to the sentence, not to the address. */
const TRAILING = /[.,;:!?)\]}'"”’]+$/

/**
 * Splits a description into plain text and safe links. Everything stays a string
 * for React to escape; nothing here produces markup.
 */
export function linkify(text: string): Piece[] {
  const out: Piece[] = []
  let last = 0
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0
    const trimmed = m[0].replace(TRAILING, '')
    const href = safeHttpUrl(trimmed)
    if (!href) continue
    if (start > last) out.push({ text: text.slice(last, start) })
    out.push({ text: trimmed, href })
    last = start + trimmed.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
