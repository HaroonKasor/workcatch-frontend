import type { Note, NoteBlock } from './types'

/**
 * The reading logic behind a note card.
 *
 * Kept out of the components so it can be tested without a DOM, and so the
 * desktop card, the mobile card and the search box cannot disagree about what a
 * note contains.
 */

export interface PreviewLine {
  /** "1", "2", "3" for an ordered block; "—" for an unordered one. */
  marker: string
  text: string
}

export interface NotePreview {
  lines: PreviewLine[]
  /** "อีก 4 ขั้นตอน · 2 ลิงก์ · 1 ไฟล์", or '' when the card shows everything. */
  more: string
}

const LEAD_ORDER: NoteBlock['kind'][] = ['steps', 'contacts', 'links', 'checklist', 'text']

function hasContent(b: NoteBlock): boolean {
  if (b.kind === 'steps') return b.steps.length > 0
  if (b.kind === 'contacts') return b.contacts.length > 0
  if (b.kind === 'links') return b.links.length > 0
  if (b.kind === 'checklist') return b.items.length > 0
  if (b.kind === 'text') return b.text !== ''
  return false
}

/**
 * The block a card leads with.
 *
 * Ordered by kind rather than by position, because the useful thing to show on a
 * card is the list — the steps, the people, the links — and a note that opens
 * with a paragraph of preamble would otherwise preview the preamble and hide the
 * procedure underneath it.
 */
function leadBlock(blocks: NoteBlock[]): NoteBlock | undefined {
  for (const kind of LEAD_ORDER) {
    const hit = blocks.find((b) => b.kind === kind && hasContent(b))
    if (hit) return hit
  }
  return undefined
}

function count(blocks: NoteBlock[], kind: NoteBlock['kind'], skip?: NoteBlock): number {
  return blocks
    .filter((b) => b.kind === kind && b !== skip)
    .reduce((n, b) => {
      if (b.kind === 'steps') return n + b.steps.length
      if (b.kind === 'links') return n + b.links.length
      if (b.kind === 'contacts') return n + b.contacts.length
      if (b.kind === 'file') return n + b.files.length
      if (b.kind === 'checklist') return n + b.items.length
      return n + 1
    }, 0)
}

/**
 * What a card shows without being opened.
 *
 * A credentials block is never previewed here — its rows are drawn by the card
 * itself, masked, because a preview helper has no business deciding how a secret
 * appears on screen.
 */
export function previewOf(note: Note, limit = 3): NotePreview {
  const lead = leadBlock(note.blocks)
  const lines: PreviewLine[] = []
  let hiddenFromLead = 0

  if (lead?.kind === 'steps') {
    lead.steps.slice(0, limit).forEach((s, i) => lines.push({ marker: String(i + 1), text: s }))
    hiddenFromLead = Math.max(0, lead.steps.length - limit)
  } else if (lead?.kind === 'contacts') {
    lead.contacts.slice(0, limit).forEach((c, i) => lines.push({ marker: String(i + 1), text: c.name }))
    hiddenFromLead = Math.max(0, lead.contacts.length - limit)
  } else if (lead?.kind === 'links') {
    lead.links.slice(0, limit).forEach((l) => lines.push({ marker: '—', text: l.label }))
    hiddenFromLead = Math.max(0, lead.links.length - limit)
  } else if (lead?.kind === 'checklist') {
    lead.items.slice(0, limit).forEach((it) => lines.push({ marker: '—', text: it.text }))
    hiddenFromLead = Math.max(0, lead.items.length - limit)
  } else if (lead?.kind === 'text') {
    lines.push({ marker: '—', text: lead.text })
  }

  // Everything the card could not fit, named by type so "อีก 4" is never
  // ambiguous about four of what.
  const parts: string[] = []
  if (hiddenFromLead > 0) {
    const unit =
      lead?.kind === 'contacts' ? 'รายชื่อ'
      : lead?.kind === 'links' ? 'ลิงก์'
      : lead?.kind === 'checklist' ? 'รายการ'
      : 'ขั้นตอน'
    parts.push(`อีก ${hiddenFromLead} ${unit}`)
  }

  const links = count(note.blocks, 'links', lead)
  const files = count(note.blocks, 'file')
  const contacts = count(note.blocks, 'contacts', lead)
  if (links > 0) parts.push(`${links} ลิงก์`)
  if (contacts > 0) parts.push(`${contacts} รายชื่อ`)
  if (files > 0) parts.push(`${files} ไฟล์`)

  return { lines, more: parts.join(' · ') }
}

/**
 * The bullets a masked value is drawn as.
 *
 * Always the same count, never one per character. How long a password is narrows
 * the search for it, so a mask that grew with the value would leak the one thing
 * the mask exists to hide — and a four-dot row would advertise a weak password
 * to anyone glancing at the screen.
 */
const MASK_DOTS = 10

export function maskOf(): string {
  return '•'.repeat(MASK_DOTS)
}

/**
 * Free-text search over a note.
 *
 * It reads titles, tags and ordinary block content. It does NOT read credential
 * values — they are not on the note object at all, and the design says so out
 * loud: "การค้นหาไม่รวมค่าที่ซ่อนไว้ในข้อมูลเข้าสู่ระบบ — ค่าเหล่านั้นไม่ถูกทำดัชนีโดยตั้งใจ".
 * A secret that can be found by typing a guess into a search box is not hidden.
 */
export function noteMatches(note: Note, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true

  const haystack: string[] = [note.title, ...note.tags]
  for (const b of note.blocks) {
    if (b.kind === 'heading' || b.kind === 'text') haystack.push(b.text)
    if (b.kind === 'steps') haystack.push(...b.steps)
    if (b.kind === 'checklist') haystack.push(...b.items.map((i) => i.text))
    if (b.kind === 'links') haystack.push(...b.links.map((l) => l.label))
    if (b.kind === 'contacts') haystack.push(...b.contacts.map((c) => `${c.name} ${c.detail}`))
    if (b.kind === 'file') haystack.push(...b.files.map((f) => f.name))
    // credentials: deliberately not indexed, not even the labels.
  }
  return haystack.join(' ').toLowerCase().includes(q)
}

/** Ticks one checklist item, returning fresh blocks. Pure, so the store stays dumb. */
export function toggleChecklistItem(
  blocks: NoteBlock[],
  blockId: string,
  itemId: string,
): NoteBlock[] {
  return blocks.map((b) =>
    b.id === blockId && b.kind === 'checklist'
      ? { ...b, items: b.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
      : b,
  )
}
