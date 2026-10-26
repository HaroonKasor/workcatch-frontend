import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCreateProject, useDeletedProjects, useProjects, useRestoreProject, useTasks } from '../lib/api'
import { useToast } from '../components/Toast'
import { gutterLabel, timeStateOf } from '../lib/time'
import { COOL, projectDot, timeText } from '../lib/style'
import type { DeletedProject, Project, ProjectColor, Task } from '../lib/types'
import { useNow } from '../lib/useNow'
import { SkeletonCard, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'

/**
 * /app/projects — Figma v2 423:1320 (each card opens /app/projects/:id, 423:1418); v1 46:729
 *
 * The archived card on that frame is the reason this screen knows about more
 * than a name and a colour. Archiving is not deleting: every task the project
 * ever held is still there and still counted under เสร็จแล้ว, it just takes no
 * new work. So the card is drawn dashed — the same "not live" language the
 * inbox slots and Quick Add use — its live counters read zero, and it says
 * เก็บเข้าคลัง out loud rather than relying on the dashes to be noticed.
 */
/** The card grid, at the 168px minimum height a project card settles at. */
function ProjectsSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดโปรเจกต์">
      <SkeletonPageHeader />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} h="168px" />
        ))}
      </div>
    </SkeletonScreen>
  )
}

export default function Projects() {
  const projects = useProjects()
  const tasks = useTasks()
  const now = useNow()
  const [creating, setCreating] = useState(false)

  if (projects.isPending || tasks.isPending) return <ProjectsSkeleton />

  const all = tasks.data ?? []
  // Live first, archived after, so the working set is never pushed down the page
  // by projects nobody is adding to.
  const ordered = [...(projects.data ?? [])].sort(
    (a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt),
  )
  const archived = ordered.filter((p) => p.archivedAt).length

  return (
    <>
      <p className="t-caption text-ink-3">โปรเจกต์ทั้งหมด</p>
      <h1 className="t-page-title mt-1">โปรเจกต์</h1>
      {archived > 0 && <p className="sr-only">เก็บเข้าคลังแล้ว {archived} โปรเจกต์ งานเก่ายังอยู่ครบ</p>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((p) => (
          <Card
            key={p.id}
            project={p}
            tasks={all.filter((t) => t.project?.id === p.id)}
            now={now}
          />
        ))}
        {creating ? (
          <NewProjectCard onDone={() => setCreating(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="wc-lift flex min-h-[168px] flex-col items-center justify-center gap-1.5 rounded-sheet border border-dashed border-ink-3 px-5 py-5 text-ink-2 hover:border-ink-2"
          >
            <span className="text-[13.5px] font-medium">+ สร้างโปรเจกต์</span>
            <span className="t-meta text-ink-3">เลือกสีได้จาก 6 สีโทนเย็น</span>
          </button>
        )}
      </div>

      <DeletedProjects now={now} />
    </>
  )
}

/**
 * "โปรเจกต์ที่ลบ" — the project bin. A delete is undoable for 30 days, and this
 * is where the undo lives after the toast has gone. Rendered only when the bin
 * has something in it: an empty section would be a heading with nothing to do.
 */
function DeletedProjects({ now }: { now: Date }) {
  const bin = useDeletedProjects()
  const restore = useRestoreProject()
  const toast = useToast()
  const items = bin.data ?? []

  if (bin.isError) {
    return (
      <section className="mt-10" aria-labelledby="project-bin">
        <h2 id="project-bin" className="t-section">โปรเจกต์ที่ลบ</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-sheet border border-error/40 bg-sheet px-5 py-4">
          <p className="t-body text-error">โหลดรายการโปรเจกต์ที่ลบไม่สำเร็จ</p>
          <button
            type="button"
            onClick={() => void bin.refetch()}
            className="wc-lift min-h-11 rounded-control border border-rule px-3 text-[12px] font-medium"
          >
            ลองใหม่
          </button>
        </div>
      </section>
    )
  }
  if (items.length === 0) return null

  return (
    <section className="mt-10" aria-labelledby="project-bin">
      <h2 id="project-bin" className="t-section">โปรเจกต์ที่ลบ</h2>
      <ul className="mt-3 divide-y divide-rule-soft rounded-sheet border border-rule bg-sheet">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <span className={`size-1.5 shrink-0 rounded-full ${projectDot[p.color]}`} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
              <span className="t-meta mt-0.5 block text-ink-3">
                {binNote(p, now)}
              </span>
            </span>
            <button
              type="button"
              disabled={restore.isPending}
              onClick={() =>
                restore.mutate(p.id, {
                  onSuccess: () =>
                    toast({
                      title: 'กู้คืนโปรเจกต์แล้ว',
                      body: p.taskCount > 0 ? `${p.name} · งาน ${p.taskCount} รายการกลับเข้าโปรเจกต์` : p.name,
                    }),
                })
              }
              className="wc-lift min-h-11 shrink-0 rounded-control border border-rule px-3.5 text-[12px] font-medium disabled:opacity-55"
            >
              กู้คืน<span className="sr-only"> {p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "งาน 3 รายการ · ลบถาวรในอีก 12 วัน" — counted, so the restore is checkable. */
function binNote(p: DeletedProject, now: Date): string {
  // Clamped: the shared clock ticks every 30 s, and a project deleted since
  // the last tick would otherwise read "31 days".
  const days = Math.min(30, Math.max(0, Math.ceil((Date.parse(p.purgeAt) - now.getTime()) / 86_400_000)))
  const when = days === 0 ? 'ลบถาวรภายในวันนี้' : `ลบถาวรในอีก ${days} วัน`
  return p.taskCount > 0 ? `งาน ${p.taskCount} รายการ · ${when}` : when
}

/**
 * Creating in place rather than in a dialog: the point of choosing a colour is
 * seeing it next to the colours already in use, which a modal covers up.
 */
function NewProjectCard({ onDone }: { onDone: () => void }) {
  const create = useCreateProject()
  const toast = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState<ProjectColor>('BLUE')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="flex min-h-[168px] flex-col rounded-sheet border border-rule bg-sheet px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError('ตั้งชื่อโปรเจกต์ก่อน')
          return
        }
        create.mutate(
          { name, color },
          {
            onSuccess: (p) => {
              toast({ title: 'สร้างโปรเจกต์แล้ว', body: p.name })
              onDone()
            },
            onError: (err) => setError(err.message),
          },
        )
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (error) setError(null)
        }}
        placeholder="ชื่อโปรเจกต์"
        aria-label="ชื่อโปรเจกต์"
        aria-invalid={!!error}
        className={`h-9 w-full rounded-control border bg-ground px-2.5 text-[13.5px] placeholder:text-ink-3 ${
          error ? 'border-error' : 'border-rule'
        }`}
      />
      {error && <p className="mt-1.5 text-[12px] text-error">{error}</p>}

      <p className="t-label mt-3.5 text-ink-3">สี</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {COOL.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setColor(c.value)}
            aria-pressed={color === c.value}
            aria-label={c.label}
            title={c.label}
            className={`grid size-7 place-items-center rounded-full border ${
              color === c.value ? 'border-ink' : 'border-rule'
            }`}
          >
            <span className={`size-3 rounded-full ${projectDot[c.value]}`} aria-hidden />
          </button>
        ))}
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <button
          type="button"
          onClick={onDone}
          className="wc-lift h-9 flex-1 rounded-control border border-rule text-[12.5px] font-medium"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="wc-lift h-9 flex-1 rounded-control bg-brand text-[12.5px] font-medium text-on-dark disabled:opacity-55"
        >
          สร้าง
        </button>
      </div>
    </form>
  )
}

/**
 * One project — Figma v2 423:1320. The whole card opens the project's page,
 * where its edit and delete controls now live (423:1418); the grid is for
 * reading progress at a glance, and three buttons on every card made it a
 * toolbar instead.
 */
function Card({ project, tasks, now }: {
  project: Project
  tasks: Task[]
  now: Date
}) {
  const filed = !!project.archivedAt
  const open = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
  const overdue = open.filter((t) => timeStateOf(t, now) === 'late')
  const done = tasks.filter((t) => t.status === 'DONE')

  // The next deadline is the only thing on this card allowed a warm colour, and
  // an archived project has no next deadline by definition.
  const next = filed
    ? undefined
    : [...open].filter((t) => t.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0]
  const nextState = next ? timeStateOf(next, now) : null

  const total = open.length + done.length
  const progress = total > 0 ? (done.length / total) * 100 : 100

  return (
    <Link
      to={`/app/projects/${project.id}`}
      className={`wc-lift block rounded-sheet border px-5 py-4.5 ${
        filed ? 'border-rule-soft bg-sheet/60' : 'border-rule bg-sheet'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`size-2.5 shrink-0 rounded-full ${projectDot[project.color]} ${filed ? 'opacity-60' : ''}`} aria-hidden />
        <h2 className={`min-w-0 truncate text-[15px] font-medium ${filed ? 'text-ink-2' : ''}`}>{project.name}</h2>
        {/* The word, not just the wash: a lighter card is a style, and a style
            is not a state anyone can be asked to decode. */}
        {filed && <span className="t-caption ml-auto shrink-0 text-ink-3">เก็บเข้าคลัง</span>}
      </div>

      <dl className="mt-4 flex">
        <Stat label="ค้างอยู่" value={filed ? 0 : open.length} tone={filed ? 'text-ink-3' : 'text-ink'} />
        <Stat
          label="เกินกำหนด"
          value={filed ? 0 : overdue.length}
          tone={!filed && overdue.length > 0 ? 'text-time-late' : 'text-ink-3'}
        />
        <Stat label="เสร็จแล้ว" value={done.length} tone="text-ink-3" />
      </dl>

      <div className="mt-4 h-[3px] w-full bg-rule-soft">
        <div className={`h-full ${filed ? 'bg-ink-3/45' : 'bg-ink'}`} style={{ width: `${filed ? 100 : progress}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="t-meta text-ink-3">กำหนดส่งถัดไป</span>
        <span className={`font-mono text-[12px] ${nextState ? timeText[nextState] : 'text-ink-3'}`}>
          {next ? gutterLabel(next, now) : 'ไม่มีงานค้าง'}
        </span>
      </div>
    </Link>
  )
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex-1">
      <dt className="t-meta text-ink-3">{label}</dt>
      <dd className={`font-mono text-[17px] font-semibold leading-tight ${tone}`}>{value}</dd>
    </div>
  )
}
