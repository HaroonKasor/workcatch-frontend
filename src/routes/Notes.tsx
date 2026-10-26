import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CredentialsBlock } from '../components/Credentials'
import { SkeletonCard, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { useNotes, useProjects } from '../lib/api'
import { noteMatches, previewOf } from '../lib/notes'
import { noteCategoryLabel, projectDot } from '../lib/style'
import { sinceLabel } from '../lib/time'
import type { Note, NoteCategory, Project } from '../lib/types'
import { useNow } from '../lib/useNow'

/**
 * /app/notes — Figma v2 423:1468 (1440), 423:3436 (390); v1 127:1082, 143:1244
 *
 * Notes have no deadline, so this is the one list in the product that is not
 * ordered by time. Pinned first, then everything else by how recently it was
 * touched: for a reference document, "the one I edited last" is the closest
 * thing to a priority there is.
 */

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pinned', label: 'ปักหมุด' },
  { key: 'WORKFLOW', label: 'ขั้นตอนงาน' },
  { key: 'CONTACTS', label: 'ผู้ติดต่อ' },
  { key: 'CREDENTIALS', label: 'ข้อมูลเข้าสู่ระบบ' },
]

export default function Notes() {
  const { data, isPending, isError } = useNotes()
  const projects = useProjects()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const now = useNow()
  const filter = params.get('filter') ?? 'all'

  const { pinned, rest } = useMemo(() => {
    const matching = (data ?? [])
      .filter((n) => noteMatches(n, q))
      .filter((n) => {
        if (filter === 'all') return true
        if (filter === 'pinned') return n.pinned
        return n.category === (filter as NoteCategory)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return {
      pinned: matching.filter((n) => n.pinned),
      rest: matching.filter((n) => !n.pinned),
    }
  }, [data, filter, q])

  if (isPending) return <NotesSkeleton />
  if (isError) return <p className="t-body text-error">โหลดบันทึกไม่ได้</p>

  const projectOf = (n: Note) => (projects.data ?? []).find((p) => p.id === n.projectId)
  const nothing = pinned.length === 0 && rest.length === 0
  const filtered = filter !== 'all' || q.trim() !== ''

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-eyebrow text-ink-3">คู่มือและบันทึก</p>
          <h1 className="t-page-title mt-1">บันทึก</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* The way into the bin — Figma 219:28. Every delete dialog in the
              product promises 30 days of recovery, and until this link existed
              the only way to act on that promise was the nine seconds the undo
              toast stayed up. Shown at every width: a phone deletes notes too. */}
          <Link
            to="/app/notes/trash"
            className="wc-lift flex min-h-11 items-center rounded-control px-3 text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            ถังลบ
          </Link>
          {/* Desktop only. On a phone the tab bar's + already offers เพิ่มบันทึก,
              and Figma 143:1244 has no second create button competing with it. */}
          {/* v2 423:1468: the brand button, worded บันทึกใหม่. */}
          <Link
            to="/app/notes/new"
            className="wc-lift hidden min-h-11 items-center rounded-control bg-brand px-4 text-[13px] font-medium text-on-dark lg:flex"
          >
            + บันทึกใหม่
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setParams(f.key === 'all' ? {} : { filter: f.key })}
            className={[
              'wc-lift min-h-11 rounded-control px-3.5 text-[12px] lg:min-h-0 lg:py-1.5',
              filter === f.key
                ? 'bg-ink font-medium text-on-dark'
                : 'border border-rule bg-sheet text-ink-2',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <label className="w-full lg:ml-auto lg:w-65">
          <span className="sr-only">ค้นหาบันทึก</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาบันทึก ไม่รวมค่าที่ซ่อนไว้"
            className="h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[12px] placeholder:text-ink-3 lg:h-[31px]"
          />
        </label>
      </div>

      {nothing ? (
        filtered ? <NoMatch query={q} /> : <FirstNote />
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="mt-7">
              <h2 className="t-label text-ink-3">ปักหมุดไว้</h2>
              <Grid notes={pinned} projectOf={projectOf} now={now} />
            </section>
          )}
          {rest.length > 0 && (
            <section className="mt-8">
              <h2 className="t-label text-ink-3">
                {pinned.length > 0 ? `ทั้งหมด ${rest.length} รายการ` : `${rest.length} รายการ`}
              </h2>
              <Grid notes={rest} projectOf={projectOf} now={now} />
            </section>
          )}
        </>
      )}
    </>
  )
}

function Grid({ notes, projectOf, now }: {
  notes: Note[]
  projectOf: (n: Note) => Project | undefined
  now: Date
}) {
  return (
    <div className="mt-3.5 grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} project={projectOf(n)} now={now} />
      ))}
    </div>
  )
}

/**
 * Figma 128:1165.
 *
 * The whole card is the link, because on a card this dense a small hit target
 * inside it would be the only tappable region on a 390px screen. The credentials
 * variant is the exception: its reveal button lives inside a link, so the card
 * body is a link and the block sits outside it.
 */
function NoteCard({ note, project, now }: { note: Note; project?: Project; now: Date }) {
  const credentials = note.blocks.find((b) => b.kind === 'credentials')
  const preview = previewOf(note)

  return (
    <article className="wc-lift flex flex-col rounded-sheet border border-rule bg-sheet px-5 pt-5 pb-[18px]">
      <Link to={`/app/notes/${note.id}`} className="min-w-0 rounded-sheet">
        <div className="flex items-center gap-2.5">
          <span className="t-label text-ink-3">{noteCategoryLabel[note.category]}</span>
          {note.pinned && <span className="t-label text-ink-2">ปักหมุด</span>}
        </div>
        <h3 className="t-section mt-2">{note.title}</h3>
      </Link>

      {credentials ? (
        <div className="mt-3">
          <CredentialsBlock block={credentials} subject={note.title} compact />
        </div>
      ) : (
        <Link to={`/app/notes/${note.id}`} className="mt-3 block rounded-sheet">
          {preview.lines.map((line, i) => (
            <p key={i} className={`flex gap-2.5 ${i > 0 ? 'mt-1.5' : ''}`}>
              <span className="w-3.5 shrink-0 font-mono text-[12px] leading-[1.45] text-ink-3">
                {line.marker}
              </span>
              <span className="min-w-0 flex-1 text-[12.5px] leading-[1.45] text-ink-2">
                {line.text}
              </span>
            </p>
          ))}
          {preview.more && <p className="t-caption mt-1.5 text-ink-3">{preview.more}</p>}
        </Link>
      )}

      <div className="mt-4 h-px w-full bg-rule-soft" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {project && (
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${projectDot[project.color]}`} aria-hidden />
            <span className="t-meta text-ink-2">{project.name}</span>
          </>
        )}
        {note.taskIds.length > 0 && (
          <span className="t-meta text-ink-3">· ผูกกับ {note.taskIds.length} งาน</span>
        )}
        <span className="t-caption ml-auto shrink-0 text-ink-3">
          แก้ {sinceLabel(note.updatedAt, now)}
        </span>
      </div>
    </article>
  )
}

/**
 * The empty screen is the first thing a new user sees, so it says what the
 * feature is FOR rather than that there is no data — Figma 147:1248.
 */
function FirstNote() {
  return (
    <div className="mt-7 rounded-sheet border border-rule bg-sheet px-8 py-11">
      <p className="t-section">เก็บวิธีทำงานที่ต้องทำซ้ำ</p>
      <p className="t-body text-ink-2 mt-2.5 max-w-[46ch] leading-relaxed">
        งานบางอย่างทำเดือนละครั้งแล้วลืมขั้นตอนทุกครั้ง บันทึกไว้ที่นี่แล้วผูกกับงานจริง คราวหน้าเปิดงานก็เจอวิธีทำทันที
      </p>
      <Link
        to="/app/notes/new"
        className="wc-lift mt-5 inline-flex min-h-11 items-center rounded-control bg-ink px-4.5 text-[13px] font-medium text-on-dark"
      >
        สร้างบันทึกแรก
      </Link>
      <p className="t-note text-ink-3 mt-4 max-w-[46ch]">
        เก็บได้: ขั้นตอน · Checklist · ลิงก์ · ผู้ติดต่อ · ไฟล์ · ข้อมูลเข้าสู่ระบบแบบซ่อนค่า
      </p>
    </div>
  )
}

/** Figma 147:1259. A filter that matched nothing is not the same as no notes. */
function NoMatch({ query }: { query: string }) {
  return (
    <div className="mt-7 rounded-sheet border border-rule bg-sheet px-8 py-11">
      <p className="t-section">
        {query.trim() ? `ไม่พบบันทึกที่ตรงกับ “${query.trim()}”` : 'ไม่มีบันทึกที่ตรงกับตัวกรอง'}
      </p>
      <p className="t-body text-ink-2 mt-2.5 max-w-[46ch] leading-relaxed">
        ลองใช้คำที่สั้นลง หรือเปลี่ยนไปค้นจากชื่อโปรเจกต์แทน
      </p>
      <p className="t-note text-ink-3 mt-4 max-w-[46ch]">
        การค้นหาไม่รวมค่าที่ซ่อนไว้ในข้อมูลเข้าสู่ระบบ — ค่าเหล่านั้นไม่ถูกทำดัชนีโดยตั้งใจ
      </p>
    </div>
  )
}

function NotesSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดบันทึก">
      <SkeletonPageHeader />
      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </SkeletonScreen>
  )
}
