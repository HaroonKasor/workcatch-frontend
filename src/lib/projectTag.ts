/**
 * `#ชื่อโปรเจกต์` in a Quick Add title.
 *
 * These are the SAME rules as the LINE bot's — backend
 * `service/ProjectTag.java` — so a tag typed on the web and the same tag sent
 * over LINE land in the same project. Change one, change both; the two test
 * files say the same sentences.
 *
 * Matching, against live (not archived) projects, after `normalizeName`:
 *   1. exactly one name equal to the tag: that project;
 *   2. otherwise exactly one name starting with the tag: that project;
 *   3. more than one at either step: ambiguous — the person picks;
 *   4. none: not found, with the three closest names.
 * Exact beats prefix, so "#ขาย" can still pick "ขาย" when "ขายส่ง" exists.
 *
 * Pure and dependency-free, so `node --test` can run it with no DOM.
 */

export interface NamedProject {
  id: string
  name: string
}

export type TagMatch<P extends NamedProject> =
  | { kind: 'FOUND'; token: string; project: P }
  | { kind: 'AMBIGUOUS'; token: string; names: string[] }
  | { kind: 'NOT_FOUND'; token: string; names: string[] }

/**
 * What counts as a space, written out literally because JavaScript's `\s` is
 * Unicode and Java's is ASCII by default. Identical to ProjectTag.SPACE.
 */
const SPACE = '\t\n\v\f\r \u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000'

/**
 * A `#` at the start, after a space, or after an invisible format character
 * (`\p{Cf}`: zero-width space, joiners, BOM) — so "C#" is text — up to the next
 * space, format character or `#`.
 */
const CF = String.raw`\p{Cf}`
const TAG = new RegExp(`(?<![^${SPACE}${CF}])#([^${SPACE}${CF}#]+)`, 'gu')
/** "#2", "#๑": a number, not a project. */
const NUMBER = /^\p{Nd}+$/u
const TRAILING_PUNCTUATION = /[,.;:!?)\]}'"]+$/u
/** A hashtag cannot hold a space, so "#งานฝาก" has to find "งาน ฝาก". */
const SEPARATORS = new RegExp(`[${SPACE}${CF}_-]+`, 'gu')
const SPACES = new RegExp(`[${SPACE}]+`, 'gu')
const EDGE_SPACES = /^ +| +$/gu
const BOUNDARY = new RegExp(`[${SPACE}${CF}]`, 'u')
const TAG_END = new RegExp(`[${SPACE}${CF}#]`, 'u')
// Thai that looks identical but is typed in two orders NFC does not unify.
const THAI_TONE_BEFORE_VOWEL = /([\u0E48-\u0E4B])([\u0E31\u0E34-\u0E3A])/gu
const THAI_NIKHAHIT_BEFORE_TONE = /\u0E4D([\u0E48-\u0E4B])/gu
const THAI_SPLIT_SARA_AM = /\u0E4D\u0E32/gu

export const SUGGESTIONS = 3

/**
 * NFC, Thai canonical order, lower case, then spaces, format characters, `_`
 * and `-` removed. Thai has no case; English does.
 */
export function normalizeName(value: string): string {
  return value
    .normalize('NFC')
    .replace(THAI_TONE_BEFORE_VOWEL, '$2$1')
    .replace(THAI_NIKHAHIT_BEFORE_TONE, '$1\u0E4D')
    .replace(THAI_SPLIT_SARA_AM, '\u0E33')
    .toLowerCase()
    .replace(SEPARATORS, '')
}

/** Runs of spaces become one plain space, and none is left at either end. */
export function tidy(text: string): string {
  return text.replace(SPACES, ' ').replace(EDGE_SPACES, '')
}

/**
 * The first tag and the text without it. Only the first: a second `#` is more
 * likely an ordinary hashtag than a second project.
 */
export function extractTag(text: string): { token: string | null; remainder: string } {
  for (const m of text.matchAll(TAG)) {
    const token = m[1].replace(TRAILING_PUNCTUATION, '')
    if (normalizeName(token) === '' || NUMBER.test(token)) continue
    const start = m.index
    const end = start + m[0].length
    return { token, remainder: tidy(`${text.slice(0, start)} ${text.slice(end)}`) }
  }
  return { token: null, remainder: tidy(text) }
}

export function matchTag<P extends NamedProject>(token: string, projects: P[]): TagMatch<P> {
  const tag = normalizeName(token)
  const exact: P[] = []
  const prefix: P[] = []
  for (const p of projects) {
    const name = normalizeName(p.name)
    if (name === '') continue
    if (name === tag) exact.push(p)
    else if (name.startsWith(tag)) prefix.push(p)
  }
  if (exact.length === 1) return { kind: 'FOUND', token, project: exact[0] }
  if (exact.length > 1) return { kind: 'AMBIGUOUS', token, names: sortedNames(exact) }
  if (prefix.length === 1) return { kind: 'FOUND', token, project: prefix[0] }
  if (prefix.length > 1) return { kind: 'AMBIGUOUS', token, names: sortedNames(prefix) }
  return { kind: 'NOT_FOUND', token, names: closest(tag, projects) }
}

/**
 * The tag the caret is inside, for the autocomplete list: its span in the text
 * and what has been typed after the `#` so far (possibly nothing).
 */
export function tagAtCaret(text: string, caret: number): { start: number; end: number; query: string } | null {
  const before = text.slice(0, caret)
  const hash = before.lastIndexOf('#')
  if (hash < 0) return null
  if (hash > 0 && !BOUNDARY.test(before[hash - 1])) return null
  const typed = before.slice(hash + 1)
  if (TAG_END.test(typed)) return null
  // The tag runs on past the caret until the next space, so picking a name
  // while the caret sits mid-word replaces the whole word, not half of it.
  const after = text.slice(caret)
  const tail = after.search(TAG_END)
  const end = tail < 0 ? text.length : caret + tail
  return { start: hash, end, query: typed }
}

/**
 * What the autocomplete offers for a partial tag: exact first, then prefix
 * matches, both by name. An empty query offers every live project.
 */
export function suggestProjects<P extends NamedProject>(query: string, projects: P[], limit = 6): P[] {
  const tag = normalizeName(query)
  const exact = projects.filter((p) => normalizeName(p.name) === tag)
  const prefix = projects
    .filter((p) => normalizeName(p.name) !== tag && normalizeName(p.name).startsWith(tag))
    .sort((a, b) => byCodePoint(a.name, b.name))
  return [...exact, ...prefix].slice(0, limit)
}

/** Takes the span out of the text and tidies the spaces it leaves behind. */
export function removeSpan(text: string, start: number, end: number): string {
  return `${text.slice(0, start)} ${text.slice(end)}`.replace(SPACES, ' ').replace(/^ +/u, '')
}

function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function sortedNames(projects: NamedProject[]): string[] {
  // Code-point order, like the Java side's String sort, so both list the
  // candidates in the same order.
  return projects.map((p) => p.name).sort(byCodePoint)
}

function closest(tag: string, projects: NamedProject[]): string[] {
  return projects
    .filter((p) => normalizeName(p.name) !== '')
    .map((p) => {
      const name = normalizeName(p.name)
      const head = name.slice(0, tag.length)
      return { name: p.name, score: Math.min(distance(tag, name), distance(tag, head)) }
    })
    .sort((a, b) => a.score - b.score || byCodePoint(a.name, b.name))
    .slice(0, SUGGESTIONS)
    .map((s) => s.name)
}

/** Levenshtein over UTF-16 units, exactly as the Java side counts them. */
export function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  let current = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
    }
    ;[previous, current] = [current, previous]
  }
  return previous[b.length]
}
