import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Skeleton, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { UnlockCodeDialog } from '../components/UnlockCode'
import { useCreateNote, useNote, useProjects, useUnlockCodeStatus, useUpdateNote, usingApi } from '../lib/api'
import { fileScan, noteBlockLabel, noteCategoryLabel, projectDot } from '../lib/style'
import { store } from '../lib/store'
import type { Note, NoteBlock, NoteBlockKind, NoteCategory } from '../lib/types'

/**
 * /app/notes/new and /app/notes/:id/edit — Figma node 154:1303 (1440), 173:1389 (390)
 *
 * One screen for both, because "create" and "edit" differ only in whether the
 * form starts empty. Two screens would be two places for the validation rules,
 * the block editor and the credential handling to drift apart, and the third of
 * those is not a drift anyone should be relaxed about.
 */

const TITLE_MAX = 150

const CATEGORIES: NoteCategory[] = ['WORKFLOW', 'CONTACTS', 'LINKS', 'CREDENTIALS']

const ADDABLE: NoteBlockKind[] = [
  'heading', 'text', 'steps', 'checklist', 'links', 'contacts', 'file', 'credentials',
]

let seq = 0
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${seq++}`

function emptyBlock(kind: NoteBlockKind): NoteBlock {
  const id = uid('b')
  switch (kind) {
    case 'heading': return { id, kind, text: '' }
    case 'text': return { id, kind, text: '' }
    case 'steps': return { id, kind, steps: [''] }
    case 'checklist': return { id, kind, items: [{ id: uid('c'), text: '', done: false }] }
    case 'links': return { id, kind, links: [{ id: uid('l'), label: '', href: '' }] }
    case 'contacts': return { id, kind, contacts: [{ id: uid('ct'), name: '', detail: '' }] }
    case 'file': return { id, kind, files: [] }
    case 'credentials':
      return {
        id, kind,
        fields: [
          { id: uid('cf'), label: 'ที่อยู่เว็บ', value: '', secret: false },
          { id: uid('cf'), label: 'ชื่อผู้ใช้', secret: true },
          { id: uid('cf'), label: 'รหัสผ่าน', secret: true },
        ],
      }
  }
}

export default function NoteEdit() {
  const { id } = useParams()
  const existing = useNote(id)

  if (id && existing.isPending) return <EditSkeleton />
  if (id && (existing.isError || !existing.data)) {
    return <p className="t-body text-error">ไม่พบบันทึกนี้</p>
  }

  // Keyed on the note, so the form's state is INITIALISED from it rather than
  // synced into it by an effect. A note that arrives late mounts a fresh form
  // instead of overwriting whatever the person had already typed.
  return <NoteForm key={existing.data?.id ?? 'new'} note={existing.data ?? undefined} />
}

function NoteForm({ note }: { note?: Note }) {
  const editing = !!note
  const projects = useProjects()
  const create = useCreateNote()
  const update = useUpdateNote()
  const unlockStatus = useUnlockCodeStatus()
  const toast = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState(note?.title ?? '')
  const [category, setCategory] = useState<NoteCategory>(note?.category ?? 'WORKFLOW')
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [projectId, setProjectId] = useState<string | undefined>(note?.projectId)
  const [blocks, setBlocks] = useState<NoteBlock[]>(note?.blocks ?? [emptyBlock('steps')])
  const [touched, setTouched] = useState(false)
  const [adding, setAdding] = useState(false)
  const [settingUnlockCode, setSettingUnlockCode] = useState(false)
  /** The block whose "/" opened the type palette, if any. */
  const [slashFor, setSlashFor] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Secret values typed in this session, held apart from the block so the note
  // body never carries a plaintext even for the length of a render.
  const pendingSecrets = useRef<Record<string, string>>({})

  /**
   * The autosave stamp.
   *
   * It marks when the draft in this tab last settled — it is not a save to the
   * server, and it deliberately does not write anything to storage: a draft of a
   * note with a credentials block would put the shape of someone's secrets into
   * localStorage. Server-side drafts are backend work; when they exist, this is
   * where the mutation goes.
   */
  const [stampedAt, setStampedAt] = useState<Date | null>(null)
  useEffect(() => {
    if (title === '' && blocks.length === 0) return
    const t = setTimeout(() => setStampedAt(new Date()), 1200)
    return () => clearTimeout(t)
  }, [title, blocks, tags, category, projectId])

  const invalid = touched && title.trim() === ''

  function persist() {
    const secretValues = pendingSecrets.current
    // The development store keeps its vault separately. In API mode the secret
    // block payload is the vault write, so a local write would both be ignored
    // by the server and leave the two sources disagreeing.
    if (!usingApi) {
      for (const [fieldId, value] of Object.entries(secretValues)) store.setSecret(fieldId, value)
    }
    pendingSecrets.current = {}

    const payload = {
      title: title.trim(), category, tags, projectId,
      blocks: prune(blocks).map((block) => block.kind !== 'credentials' ? block : {
        ...block,
        fields: block.fields.map((field) => secretValues[field.id] === undefined
          ? field
          : { ...field, value: secretValues[field.id] }),
      }),
    }

    if (editing && note) {
      update.mutate(
        { id: note.id, patch: payload, summary: 'แก้ไขเนื้อหาบันทึก' },
        { onSuccess: () => void navigate(`/app/notes/${note.id}`) },
      )
      toast({ title: 'บันทึกแล้ว', body: `บันทึกเป็นเวอร์ชัน ${note.version + 1}` })
    } else {
      create.mutate(payload, {
        onSuccess: (created) => {
          toast({ title: 'สร้างบันทึกแล้ว', body: 'ผูกกับงานได้จากหน้ารายละเอียด' })
          void navigate(`/app/notes/${created.id}`)
        },
      })
    }
  }

  function save() {
    setTouched(true)
    if (title.trim() === '') {
      titleRef.current?.focus()
      return
    }
    // The first stored secret needs an unlock code. Do this before moving a
    // value into the vault or writing the note, so cancelling leaves the editor
    // exactly as it was.
    if (Object.keys(pendingSecrets.current).length > 0 && unlockStatus.data?.set !== true) {
      setSettingUnlockCode(true)
      return
    }
    persist()
  }

  const cancelTo = editing && note ? `/app/notes/${note.id}` : '/app/notes'

  return (
    <>
      <p className="t-eyebrow text-ink-3">
        <Link to="/app/notes" className="hover:text-ink-2">บันทึก</Link>
        {'  ›  '}
        {editing ? 'แก้ไข' : 'สร้างใหม่'}
      </p>

      <div className="mt-4 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0">
          {/* Title — Figma 154:1392 */}
          <div>
            <label>
              <span className="sr-only">ชื่อบันทึก</span>
              <input
                ref={titleRef}
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={invalid}
                aria-describedby="title-help"
                placeholder="ชื่อบันทึก"
                className={`h-[54px] w-full rounded-control border bg-sheet px-3.5 font-display text-[24px] font-medium tracking-[-0.4px] placeholder:font-sans placeholder:text-[16px] placeholder:text-ink-3 ${
                  invalid ? 'border-error' : 'border-rule'
                }`}
              />
            </label>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p id="title-help" className={`t-note ${invalid ? 'text-error' : 'text-ink-3'}`}>
                ชื่อบันทึกจำเป็น
              </p>
              <p className="t-caption shrink-0 text-ink-3">
                {title.length} / {TITLE_MAX}
              </p>
            </div>
          </div>

          {/* Classify — Figma 154:1401 */}
          <div className="mt-7 space-y-3">
            <ChipRow label="ประเภท">
              {CATEGORIES.map((c) => (
                <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
                  {noteCategoryLabel[c]}
                </Chip>
              ))}
            </ChipRow>

            <ChipRow label="แท็ก">
              {tags.map((t) => (
                <Chip key={t} selected onClick={() => setTags(tags.filter((x) => x !== t))} label={`เอาแท็ก ${t} ออก`}>
                  {t} ×
                </Chip>
              ))}
              <TagAdder onAdd={(t) => !tags.includes(t) && setTags([...tags, t])} />
            </ChipRow>

            <ChipRow label="โปรเจกต์">
              {(projects.data ?? []).map((p) => (
                <Chip
                  key={p.id}
                  selected={projectId === p.id}
                  onClick={() => setProjectId(projectId === p.id ? undefined : p.id)}
                >
                  <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${projectDot[p.color]}`} aria-hidden />
                  {p.name}
                </Chip>
              ))}
            </ChipRow>
          </div>

          {/* Blocks — Figma 166:1389 */}
          <p className="t-label text-ink-3 mt-8">เนื้อหา</p>
          <div className="mt-3 space-y-3">
            {blocks.map((b, i) => (
              <div key={b.id}>
                <BlockEditor
                  block={b}
                  first={i === 0}
                  last={i === blocks.length - 1}
                  onChange={(next) => setBlocks(blocks.map((x) => (x.id === b.id ? next : x)))}
                  onMove={(dir) => setBlocks(move(blocks, i, dir))}
                  onDuplicate={() => setBlocks(duplicate(blocks, i))}
                  onRemove={() => setBlocks(blocks.filter((x) => x.id !== b.id))}
                  onSlash={() => setSlashFor(b.id)}
                  onSecret={(fieldId, value) => {
                    if (value === '') delete pendingSecrets.current[fieldId]
                    else pendingSecrets.current[fieldId] = value
                  }}
                />
                {/* The "/" palette converts the empty block it was typed in,
                    which is why it is anchored here and not at the bottom. */}
                {slashFor === b.id && (
                  <BlockPalette
                    label={`เปลี่ยนบล็อกนี้เป็น`}
                    onPick={(k) => {
                      setBlocks(blocks.map((x) => (x.id === b.id ? emptyBlock(k) : x)))
                      setSlashFor(null)
                    }}
                    onClose={() => setSlashFor(null)}
                  />
                )}
              </div>
            ))}
          </div>

          {/*
            Add-content control.
            It sticks to the bottom of the viewport instead of sitting under the
            last block, because on a note with twenty steps "add a checklist"
            would otherwise cost a scroll to the end and a scroll back. On a
            phone it rides above the tab bar; the offset is that bar's height.
          */}
          <div className="sticky bottom-[74px] z-20 mt-4 lg:bottom-4">
            <div className="rounded-control border border-rule bg-sheet/95 p-2 backdrop-blur-[2px]">
              {adding ? (
                <BlockPalette
                  label="เพิ่มเนื้อหาแบบ"
                  bare
                  onPick={(k) => { setBlocks([...blocks, emptyBlock(k)]); setAdding(false) }}
                  onClose={() => setAdding(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  aria-expanded={false}
                  className="wc-lift flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-dashed border-rule text-[13px] font-medium text-ink-2"
                >
                  + เพิ่มเนื้อหา
                  <span className="t-caption text-ink-3">หรือพิมพ์ / ในบล็อกว่าง</span>
                </button>
              )}
            </div>
          </div>

          {/* Save bar — Figma 166:1483 */}
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <div className="min-w-0">
              <p className="t-caption text-ink-3">
                {stampedAt
                  ? `บันทึกร่างอัตโนมัติเมื่อ ${stampedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                  : 'ยังไม่ได้บันทึกร่าง'}
              </p>
              <p className="t-caption text-ink-3 mt-1">
                {editing && note
                  ? `เวอร์ชัน ${note.version} · ถ้ามีคนแก้ระหว่างนี้ ระบบจะถามก่อนทับ`
                  : 'บันทึกใหม่จะเป็นเวอร์ชัน 1'}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <Link
                to={cancelTo}
                className="wc-lift flex min-h-11 items-center rounded-control border border-rule px-4 text-[13px] font-medium text-ink-2"
              >
                ยกเลิก
              </Link>
              <button
                type="button"
                onClick={save}
                disabled={create.isPending || update.isPending}
                className="wc-lift min-h-11 rounded-control bg-brand px-4 text-[13px] font-medium text-on-dark disabled:opacity-55"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>

        {/* Figma 166:1492 */}
        <aside className="min-w-0">
          <p className="t-label text-ink-3">สิ่งที่ระบบทำให้</p>
          <div className="mt-3.5 space-y-3">
            <SideNote title="ผูกกับงานได้หลายงาน" body="บันทึกหนึ่งอันใช้ซ้ำได้ ลบงานแล้วบันทึกไม่หายไปด้วย" />
            <SideNote title="เก็บทุกเวอร์ชัน" body="ย้อนดูได้ว่าใครแก้อะไรเมื่อไหร่ ยกเว้นค่าที่ซ่อนไว้" />
            <SideNote title="ตั้งวันทบทวน" body="ถึงกำหนดแล้วจะเตือนให้กลับมาตรวจว่ายังใช้ได้อยู่ไหม" />
          </div>
        </aside>
      </div>
      {settingUnlockCode && (
        <UnlockCodeDialog
          initial="set"
          onSet={() => {
            setSettingUnlockCode(false)
            persist()
          }}
          onClose={() => setSettingUnlockCode(false)}
        />
      )}
    </>
  )
}

/** Drops the empty rows a half-filled block leaves behind. */
function prune(blocks: NoteBlock[]): NoteBlock[] {
  return blocks
    .map((b) => {
      if (b.kind === 'steps') return { ...b, steps: b.steps.filter((s) => s.trim() !== '') }
      if (b.kind === 'checklist') return { ...b, items: b.items.filter((i) => i.text.trim() !== '') }
      if (b.kind === 'links') return { ...b, links: b.links.filter((l) => l.label.trim() !== '') }
      if (b.kind === 'contacts') return { ...b, contacts: b.contacts.filter((c) => c.name.trim() !== '') }
      return b
    })
    .filter((b) => {
      if (b.kind === 'heading' || b.kind === 'text') return b.text.trim() !== ''
      if (b.kind === 'steps') return b.steps.length > 0
      if (b.kind === 'checklist') return b.items.length > 0
      if (b.kind === 'links') return b.links.length > 0
      if (b.kind === 'contacts') return b.contacts.length > 0
      return true
    })
}

function move(blocks: NoteBlock[], i: number, dir: -1 | 1): NoteBlock[] {
  const j = i + dir
  if (j < 0 || j >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/**
 * Copies a block in place.
 *
 * Every id inside it is regenerated. Sharing an id between the original and the
 * copy would make React reuse the wrong row and make a checklist tick in two
 * places at once — and a duplicated credentials field would point at the same
 * vault entry as the block it came from, so a secret would silently follow the
 * copy. New ids mean the copy starts with no value behind it.
 */
function duplicate(blocks: NoteBlock[], i: number): NoteBlock[] {
  const source = structuredClone(blocks[i])
  const copy: NoteBlock = { ...source, id: uid('b') }
  if (copy.kind === 'checklist') copy.items = copy.items.map((x) => ({ ...x, id: uid('c') }))
  if (copy.kind === 'links') copy.links = copy.links.map((x) => ({ ...x, id: uid('l') }))
  if (copy.kind === 'contacts') copy.contacts = copy.contacts.map((x) => ({ ...x, id: uid('ct') }))
  if (copy.kind === 'file') copy.files = copy.files.map((x) => ({ ...x, id: uid('f') }))
  if (copy.kind === 'credentials') copy.fields = copy.fields.map((x) => ({ ...x, id: uid('cf') }))
  const next = [...blocks]
  next.splice(i + 1, 0, copy)
  return next
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="t-meta w-[74px] shrink-0 text-ink-3">{label}</span>
      {children}
    </div>
  )
}

function Chip({ selected, onClick, label, children }: {
  selected?: boolean
  onClick: () => void
  label?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={`wc-lift min-h-11 rounded-control px-3 text-[12px] lg:min-h-0 lg:py-1.5 ${
        selected ? 'border border-ink bg-selected font-medium text-ink' : 'border border-rule bg-sheet text-ink-2'
      }`}
    >
      {children}
    </button>
  )
}

function TagAdder({ onAdd }: { onAdd: (tag: string) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="wc-lift min-h-11 rounded-control border border-dashed border-rule bg-sheet px-3 text-[12px] text-ink-2 lg:min-h-0 lg:py-1.5"
      >
        + เพิ่มแท็ก
      </button>
    )
  }

  return (
    <label>
      <span className="sr-only">แท็กใหม่</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (value.trim()) onAdd(value.trim()); setValue(''); setOpen(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
          if (e.key === 'Escape') { setValue(''); setOpen(false) }
        }}
        className="h-11 w-32 rounded-control border border-rule bg-sheet px-2.5 text-[12px] lg:h-[29px]"
      />
    </label>
  )
}

function SideNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sheet border border-rule bg-sheet px-3 py-3">
      <p className="text-[13px] font-medium">{title}</p>
      <p className="t-note text-ink-3 mt-1.5">{body}</p>
    </div>
  )
}

/* ------------------------------------------------------------ block editor -- */

function BlockEditor({ block, first, last, onChange, onMove, onDuplicate, onRemove, onSlash, onSecret }: {
  block: NoteBlock
  first: boolean
  last: boolean
  onChange: (next: NoteBlock) => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
  onSlash: () => void
  onSecret: (fieldId: string, value: string) => void
}) {
  const name = noteBlockLabel[block.kind]

  /** "/" in an empty field asks what this block should be. */
  const slashKey = (value: string) => (e: React.KeyboardEvent) => {
    if (e.key === '/' && value === '') {
      e.preventDefault()
      onSlash()
    }
  }

  return (
    <section className="rounded-sheet border border-rule bg-sheet px-3.5 py-3.5">
      <header className="flex items-center gap-2">
        <span className="rounded-[3px] bg-ground px-1.5 py-[3px] font-mono text-[12px] tracking-[1.1px] text-ink-2">
          {block.kind === 'credentials' && '🔒 '}
          {name}
        </span>
        <BlockMenu
          name={name}
          first={first}
          last={last}
          onMove={onMove}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </header>

      <div className="mt-3">
        {block.kind === 'heading' && (
          <Field
            label="หัวข้อ"
            value={block.text}
            onChange={(v) => onChange({ ...block, text: v })}
            onKeyDown={slashKey(block.text)}
          />
        )}

        {block.kind === 'text' && (
          <label className="block">
            <span className="sr-only">ข้อความ</span>
            <textarea
              rows={3}
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              onKeyDown={slashKey(block.text)}
              className="w-full rounded-control border border-rule bg-sheet px-3 py-2 text-[13px] leading-[1.55]"
            />
          </label>
        )}

        {block.kind === 'steps' && (
          <>
            {block.steps.map((s, i) => (
              <div key={i} className="mt-2 flex items-center gap-3 first:mt-0">
                <span className="w-[18px] shrink-0 font-mono text-[12px] text-ink-3">{i + 1}</span>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">ขั้นตอนที่ {i + 1}</span>
                  <input
                    value={s}
                    onChange={(e) => onChange({ ...block, steps: block.steps.map((x, j) => (j === i ? e.target.value : x)) })}
                    onKeyDown={(e) => {
                      // Enter adds the next step, as the design's hint says.
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const next = [...block.steps]
                        next.splice(i + 1, 0, '')
                        onChange({ ...block, steps: next })
                      }
                      // "/" on the only, empty line means the block itself was
                      // the wrong choice — offer to change it.
                      if (e.key === '/' && s === '' && block.steps.length === 1) {
                        e.preventDefault()
                        onSlash()
                      }
                    }}
                    className="h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[13px]"
                  />
                </label>
                <Tool onClick={() => onChange({ ...block, steps: block.steps.filter((_, j) => j !== i) })} label={`ลบขั้นตอนที่ ${i + 1}`}>ลบ</Tool>
              </div>
            ))}
            <p className="t-note text-ink-3 mt-2.5">Enter ขึ้นบรรทัดใหม่ · / ในบรรทัดว่างเพื่อเปลี่ยนชนิดบล็อก</p>
          </>
        )}

        {block.kind === 'checklist' && (
          <>
            {block.items.map((item, i) => (
              <div key={item.id} className="mt-2 flex items-center gap-3 first:mt-0">
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={`ทำเสร็จแล้ว: ${item.text || `รายการที่ ${i + 1}`}`}
                  onChange={() => onChange({ ...block, items: block.items.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)) })}
                  className="size-4 shrink-0 accent-[var(--wc-brand-emerald)]"
                />
                <label className="min-w-0 flex-1">
                  <span className="sr-only">รายการที่ {i + 1}</span>
                  <input
                    value={item.text}
                    onChange={(e) => onChange({ ...block, items: block.items.map((x) => (x.id === item.id ? { ...x, text: e.target.value } : x)) })}
                    className="h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[13px]"
                  />
                </label>
                <Tool onClick={() => onChange({ ...block, items: block.items.filter((x) => x.id !== item.id) })} label={`ลบรายการที่ ${i + 1}`}>ลบ</Tool>
              </div>
            ))}
            <AddRow onClick={() => onChange({ ...block, items: [...block.items, { id: uid('c'), text: '', done: false }] })}>
              + เพิ่มรายการ
            </AddRow>
          </>
        )}

        {block.kind === 'links' && (
          <>
            {block.links.map((l, i) => (
              <div key={l.id} className="mt-2 flex flex-wrap items-center gap-2 first:mt-0">
                <Field label={`ชื่อลิงก์ที่ ${i + 1}`} value={l.label} className="min-w-40 flex-1"
                  onChange={(v) => onChange({ ...block, links: block.links.map((x) => (x.id === l.id ? { ...x, label: v } : x)) })} />
                <Field label={`ที่อยู่ลิงก์ที่ ${i + 1}`} value={l.href} mono className="min-w-40 flex-1"
                  onChange={(v) => onChange({ ...block, links: block.links.map((x) => (x.id === l.id ? { ...x, href: v } : x)) })} />
                <Tool onClick={() => onChange({ ...block, links: block.links.filter((x) => x.id !== l.id) })} label={`ลบลิงก์ที่ ${i + 1}`}>ลบ</Tool>
              </div>
            ))}
            <AddRow onClick={() => onChange({ ...block, links: [...block.links, { id: uid('l'), label: '', href: '' }] })}>
              + เพิ่มลิงก์
            </AddRow>
          </>
        )}

        {block.kind === 'contacts' && (
          <>
            {block.contacts.map((c, i) => (
              <div key={c.id} className="mt-2 flex flex-wrap items-center gap-2 first:mt-0">
                <Field label={`ชื่อผู้ติดต่อที่ ${i + 1}`} value={c.name} className="min-w-40 flex-1"
                  onChange={(v) => onChange({ ...block, contacts: block.contacts.map((x) => (x.id === c.id ? { ...x, name: v } : x)) })} />
                <Field label={`ข้อมูลติดต่อที่ ${i + 1}`} value={c.detail} mono className="min-w-40 flex-1"
                  onChange={(v) => onChange({ ...block, contacts: block.contacts.map((x) => (x.id === c.id ? { ...x, detail: v } : x)) })} />
                <Tool onClick={() => onChange({ ...block, contacts: block.contacts.filter((x) => x.id !== c.id) })} label={`ลบผู้ติดต่อที่ ${i + 1}`}>ลบ</Tool>
              </div>
            ))}
            <AddRow onClick={() => onChange({ ...block, contacts: [...block.contacts, { id: uid('ct'), name: '', detail: '' }] })}>
              + เพิ่มผู้ติดต่อ
            </AddRow>
          </>
        )}

        {block.kind === 'file' && <FileEditor block={block} onChange={onChange} />}

        {block.kind === 'credentials' && (
          <>
            {block.fields.map((f, i) => (
              <div key={f.id} className="mt-2 flex flex-wrap items-center gap-2 first:mt-0">
                <Field label={`ชื่อช่องที่ ${i + 1}`} value={f.label} className="w-[150px]"
                  onChange={(v) => onChange({ ...block, fields: block.fields.map((x) => (x.id === f.id ? { ...x, label: v } : x)) })} />
                {f.secret ? (
                  <label className="min-w-40 flex-1">
                    <span className="sr-only">{f.label} (ค่าที่ซ่อนไว้)</span>
                    {/* Never prefilled with the stored value. Showing an existing
                        secret here would be a reveal without a step-up — leaving
                        it blank keeps the old value until something is typed. */}
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="พิมพ์เพื่อเปลี่ยนค่า"
                      onChange={(e) => onSecret(f.id, e.target.value)}
                      className="h-11 w-full rounded-control border border-rule bg-sheet px-3 font-mono text-[12px]"
                    />
                  </label>
                ) : (
                  <Field label={f.label} value={f.value ?? ''} mono className="min-w-40 flex-1"
                    onChange={(v) => onChange({ ...block, fields: block.fields.map((x) => (x.id === f.id ? { ...x, value: v } : x)) })} />
                )}
              </div>
            ))}
            <p className="t-note text-ink-3 mt-2.5">
              ค่าถูกเข้ารหัสก่อนบันทึก ไม่เข้าดัชนีค้นหา ไม่อยู่ในประวัติเวอร์ชัน และไม่ถูกส่งทาง LINE
            </p>
          </>
        )}
      </div>
    </section>
  )
}

/**
 * Files — Figma 147:1333 / 147:1380.
 *
 * A picked file is added in `SCANNING` and stays there. This client does not and
 * cannot decide that a file is safe; BR-KN-04 puts that verdict on the server,
 * and inventing a "ปลอดภัย" badge here would be the app lying about the one
 * thing the badge exists to say. Only the name and size are kept — the bytes are
 * not read.
 */
function FileEditor({ block, onChange }: {
  block: Extract<NoteBlock, { kind: 'file' }>
  onChange: (next: NoteBlock) => void
}) {
  function add(list: FileList | null) {
    if (!list) return
    const picked = Array.from(list).map((f) => ({
      id: uid('f'),
      name: f.name,
      size: f.size > 1_048_576 ? `${(f.size / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`,
      // Over the documented limit is the one verdict the client can reach alone,
      // because it is arithmetic rather than an opinion about content.
      scan: f.size > 10 * 1_048_576 ? ('TOO_LARGE' as const) : ('SCANNING' as const),
    }))
    onChange({ ...block, files: [...block.files, ...picked] })
  }

  return (
    <>
      {block.files.map((f) => (
        <div key={f.id} className="mt-2 flex flex-wrap items-center gap-2 first:mt-0">
          <span className="min-w-0 flex-1 text-[13px] break-all">{f.name}</span>
          <span className={`shrink-0 rounded-[3px] px-2 py-[2px] font-mono text-[12px] tracking-[1.1px] ${fileScan[f.scan].tone}`}>
            {fileScan[f.scan].badge}
          </span>
          <span className="t-caption shrink-0 text-ink-3">{f.size}</span>
          <Tool onClick={() => onChange({ ...block, files: block.files.filter((x) => x.id !== f.id) })} label={`ลบไฟล์ ${f.name}`}>ลบ</Tool>
        </div>
      ))}
      <label className="wc-lift mt-3 flex cursor-pointer flex-col items-center rounded-control border border-dashed border-rule bg-ground px-4 py-5 text-center">
        <span className="text-[13px] font-medium">ลากไฟล์มาวาง หรือกดเพื่อเลือก</span>
        <span className="t-note text-ink-3 mt-1.5">PDF · XLSX · DOCX · PNG · JPG — สูงสุด 10 MB ต่อไฟล์</span>
        <input
          type="file"
          multiple
          accept=".pdf,.xlsx,.docx,.png,.jpg,.jpeg"
          onChange={(e) => add(e.target.files)}
          className="sr-only"
        />
      </label>
    </>
  )
}

function Field({ label, value, onChange, onKeyDown, mono, className = '' }: {
  label: string
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  mono?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={label}
        className={`h-11 w-full rounded-control border border-rule bg-sheet px-3 placeholder:text-ink-3 ${
          mono ? 'font-mono text-[12px]' : 'text-[13px]'
        }`}
      />
    </label>
  )
}

function Tool({ onClick, disabled, label, children }: {
  onClick: () => void
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="wc-lift grid size-11 place-items-center rounded-control text-[12px] text-ink-3 disabled:opacity-35 lg:size-auto lg:px-1.5 lg:py-1"
    >
      {children}
    </button>
  )
}

function AddRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wc-lift mt-2 min-h-11 rounded-control border border-dashed border-rule px-3 text-[12px] text-ink-2 lg:min-h-0 lg:py-1.5"
    >
      {children}
    </button>
  )
}

function EditSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดบันทึก">
      <SkeletonPageHeader standfirst={false} />
      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div>
          <Skeleton w="100%" h="54px" className="rounded-control" />
          <Skeleton w="60%" h="13px" className="mt-4" />
          <Skeleton w="45%" h="13px" className="mt-3" />
          {[0, 1].map((i) => (
            <Skeleton key={i} w="100%" h="146px" className="mt-4 rounded-sheet" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} w="100%" h="59px" className="rounded-sheet" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  )
}

/**
 * Per-block actions — Figma 173:1439 uses the same "⋯" on the phone.
 *
 * A menu rather than three inline buttons: with eight block types on screen, a
 * row of ขึ้น/ลง/ลบ per block turns the editor into a wall of controls, and the
 * two that matter most on a long note (duplicate, delete) had nowhere to go.
 */
function BlockMenu({ name, first, last, onMove, onDuplicate, onRemove }: {
  name: string
  first: boolean
  last: boolean
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const act = (fn: () => void) => () => { setOpen(false); fn() }

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`ตัวเลือกสำหรับบล็อก${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="wc-lift grid size-11 place-items-center rounded-control text-[15px] leading-none text-ink-3 lg:size-8"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`บล็อก${name}`}
          className="absolute right-0 top-full z-30 mt-1 w-[164px] overflow-hidden rounded-control border border-rule bg-sheet shadow-[0_2px_4px_rgba(23,23,23,0.06),0_16px_40px_rgba(23,23,23,0.16)]"
        >
          <MenuItem onClick={act(() => onMove(-1))} disabled={first}>ย้ายขึ้น</MenuItem>
          <MenuItem onClick={act(() => onMove(1))} disabled={last}>ย้ายลง</MenuItem>
          <MenuItem onClick={act(onDuplicate)}>ทำสำเนา</MenuItem>
          <MenuItem onClick={act(onRemove)} danger last>ลบบล็อก</MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, disabled, danger, last, children }: {
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center px-3.5 text-left text-[12.5px] disabled:opacity-35 ${
        last ? '' : 'border-b border-rule-soft'
      } ${danger ? 'text-error' : 'text-ink-2'}`}
    >
      {children}
    </button>
  )
}

/** The eight block types, offered either from the sticky bar or from a "/". */
function BlockPalette({ label, onPick, onClose, bare }: {
  label: string
  onPick: (kind: NoteBlockKind) => void
  onClose: () => void
  bare?: boolean
}) {
  return (
    <div
      className={bare ? '' : 'mt-2 rounded-control border border-rule bg-sheet p-2'}
      role="group"
      aria-label={label}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-note text-ink-3 mr-1">{label}</span>
        {ADDABLE.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            className="wc-lift min-h-11 rounded-control border border-dashed border-rule bg-sheet px-3 text-[12px] text-ink-2 lg:min-h-0 lg:py-1.5"
          >
            {k === 'credentials' ? '🔒 ' : '+ '}
            {noteBlockLabel[k]}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="wc-lift ml-auto min-h-11 rounded-control px-3 text-[12px] text-ink-3 lg:min-h-0 lg:py-1.5"
        >
          ปิด
        </button>
      </div>
    </div>
  )
}
