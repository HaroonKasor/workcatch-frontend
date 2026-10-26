import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCreateProject } from '../../lib/api'
import { COOL, projectDot } from '../../lib/style'
import { gutterLabel, timeStateOf } from '../../lib/time'
import type { Project, ProjectColor, Task } from '../../lib/types'
import { useToast } from '../Toast'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { MobileBack } from './MobileHeader'

/**
 * โปรเจกต์ on a phone — Figma 466:1294. A row per project with its open work,
 * what is late, and what is due next; the archived ones sit in their own band,
 * dimmed. Creating one is a sheet: a name and a colour.
 */
export function ProjectsMobile({ projects, tasks, now, children }: {
  projects: Project[]
  tasks: Task[]
  now: Date
  /** The project bin, which the page renders itself. */
  children?: React.ReactNode
}) {
  const [creating, setCreating] = useState(false)
  const live = projects.filter((p) => !p.archivedAt)
  const archived = projects.filter((p) => p.archivedAt)

  const row = (p: Project) => {
    const mine = tasks.filter((t) => t.project?.id === p.id && t.status !== 'CANCELLED')
    const open = mine.filter((t) => t.status !== 'DONE')
    const late = open.filter((t) => timeStateOf(t, now) === 'late').length
    const next = open.filter((t) => t.dueAt && new Date(t.dueAt) >= now).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0]
    const done = mine.length - open.length
    return (
      <li key={p.id} className="border-b border-rule-soft bg-sheet">
        <Link to={`/app/projects/${p.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
          <span className={`size-2.5 shrink-0 rounded-full ${projectDot[p.color]}`} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={`block text-[17px] leading-[1.3] font-medium ${p.archivedAt ? 'text-ink-3' : ''}`}>{p.name}</span>
            <span className="mt-0.5 block text-[14px] text-ink-3">
              {p.archivedAt ? (
                <>เสร็จ {done}{open.length === 0 ? ' · ไม่มีงานค้าง' : ''}</>
              ) : (
                <>
                  ค้าง {open.length}
                  {late > 0 && <> · <span className="text-time-late">เกิน {late}</span></>}
                  {next && ` · ถัดไป ${/^\d\d:\d\d$/.test(gutterLabel(next, now)) ? 'วันนี้ ' : ''}${gutterLabel(next, now)}`}
                </>
              )}
            </span>
          </span>
          <Icon name="chevronRight" size={18} className="text-ink-3" />
        </Link>
      </li>
    )
  }

  return (
    <div className="lg:hidden">
      <MobileBack to="/app/settings" label="เมนู" />
      <h1 className="font-display px-4 pt-1 pb-3 text-[32px] leading-[1.2] font-semibold tracking-[-0.5px]">โปรเจกต์</h1>
      <ul className="border-t border-rule">{live.map(row)}</ul>
      {archived.length > 0 && (
        <section>
          <h2 className="flex items-baseline gap-2 bg-ground px-4 pt-5 pb-2.5 text-[14px] font-medium text-ink-2">
            เก็บเข้าคลัง <span className="font-mono">{archived.length}</span>
          </h2>
          <ul className="border-y border-rule">{archived.map(row)}</ul>
        </section>
      )}
      <div className="px-4 py-5">
        <button type="button" onClick={() => setCreating(true)} aria-haspopup="dialog" className="wc-lift flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-rule bg-sheet text-[16px] font-medium">
          <Icon name="plus" size={20} />สร้างโปรเจกต์
        </button>
      </div>
      {children}
      <BottomSheet open={creating} onClose={() => setCreating(false)} title="สร้างโปรเจกต์">
        <NewProject onDone={() => setCreating(false)} />
      </BottomSheet>
    </div>
  )
}

function NewProject({ onDone }: { onDone: () => void }) {
  const create = useCreateProject()
  const toast = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState<ProjectColor>('BLUE')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="px-4 pb-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError('ตั้งชื่อโปรเจกต์ก่อน')
          return
        }
        create.mutate({ name, color }, {
          onSuccess: (p) => { toast({ title: 'สร้างโปรเจกต์แล้ว', body: p.name }); onDone() },
          onError: (err) => setError(err.message),
        })
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => { setName(e.target.value); if (error) setError(null) }}
        placeholder="ชื่อโปรเจกต์"
        aria-label="ชื่อโปรเจกต์"
        aria-invalid={!!error}
        className={`h-12 w-full rounded-control border bg-sheet px-3 text-[16px] placeholder:text-ink-3 ${error ? 'border-error' : 'border-rule'}`}
      />
      {error && <p role="alert" className="mt-1.5 text-[14px] text-error">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2.5" role="group" aria-label="สี">
        {COOL.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={color === c.value}
            aria-label={c.label}
            onClick={() => setColor(c.value)}
            className={`flex size-11 items-center justify-center rounded-full border-2 ${color === c.value ? 'border-ink' : 'border-transparent'}`}
          >
            <span className={`size-6 rounded-full ${projectDot[c.value]}`} />
          </button>
        ))}
      </div>
      <button type="submit" disabled={create.isPending} className="wc-lift mt-5 min-h-12 w-full rounded-control bg-brand-strong text-[16px] font-medium text-on-dark disabled:opacity-55">
        สร้างโปรเจกต์
      </button>
    </form>
  )
}
