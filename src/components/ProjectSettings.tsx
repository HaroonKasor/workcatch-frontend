import { useState } from 'react'
import { useUpdateProject } from '../lib/api'
import { COOL, projectDot } from '../lib/style'
import type { Project } from '../lib/types'
import { useToast } from './Toast'

/**
 * ตั้งค่าโปรเจกต์ — the third tab of the project page (Figma v2 423:1418). The
 * name, the colour, and whether it still takes new work. Deleting is not here:
 * it is the red button beside the tabs, behind its own confirmation.
 */
export function ProjectSettings({ project }: { project: Project }) {
  const update = useUpdateProject()
  const toast = useToast()
  const [name, setName] = useState(project.name)
  const [error, setError] = useState<string | null>(null)
  const filed = !!project.archivedAt

  const saveName = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('ชื่อโปรเจกต์ว่างไม่ได้')
      return
    }
    if (name.trim() === project.name) return
    update.mutate(
      { id: project.id, patch: { name: name.trim() } },
      {
        onSuccess: (p) => toast({ title: 'เปลี่ยนชื่อโปรเจกต์แล้ว', body: p.name }),
        onError: (err) => setError(err.message),
      },
    )
  }

  const archive = (next: boolean) => {
    const before = project.archivedAt ?? null
    update.mutate({ id: project.id, patch: { archivedAt: next ? new Date().toISOString() : null } })
    toast({
      title: next ? 'เก็บเข้าคลังแล้ว' : 'นำกลับมาใช้แล้ว',
      body: next
        ? `${project.name} · งานเก่ายังอยู่ครบ แต่โปรเจกต์นี้จะไม่รับงานใหม่`
        : `${project.name} · รับงานใหม่ได้อีกครั้ง`,
      action: { label: 'เลิกทำ', onAct: () => update.mutate({ id: project.id, patch: { archivedAt: before } }) },
    })
  }

  return (
    <div className="rounded-sheet border border-rule bg-sheet">
      <form onSubmit={saveName} className="border-b border-rule-soft px-5 py-4">
        <label className="block">
          <span className="text-[13px] font-medium">ชื่อโปรเจกต์</span>
          <span className="mt-2 flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              aria-invalid={!!error}
              maxLength={120}
              className={`h-11 min-w-0 flex-1 basis-56 rounded-control border bg-ground px-3 text-[13.5px] ${error ? 'border-error' : 'border-rule'}`}
            />
            <button
              type="submit"
              disabled={update.isPending || name.trim() === project.name}
              className="wc-lift min-h-11 rounded-control bg-ink px-4 text-[13px] font-medium text-on-dark disabled:opacity-45"
            >
              บันทึกชื่อ
            </button>
          </span>
        </label>
        {error && <p className="mt-1.5 text-[12px] text-error">{error}</p>}
      </form>

      <div className="border-b border-rule-soft px-5 py-4">
        <p className="text-[13px] font-medium">สี</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COOL.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => update.mutate({ id: project.id, patch: { color: c.value } })}
              aria-pressed={project.color === c.value}
              aria-label={c.label}
              title={c.label}
              className={`grid size-11 place-items-center rounded-full border ${project.color === c.value ? 'border-ink' : 'border-rule'}`}
            >
              <span className={`size-3 rounded-full ${projectDot[c.value]}`} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">{filed ? 'เก็บเข้าคลังอยู่' : 'เก็บเข้าคลัง'}</span>
          <span className="t-meta block text-ink-3">งานเก่ายังอยู่ครบ แต่โปรเจกต์ที่เก็บเข้าคลังจะไม่รับงานใหม่</span>
        </span>
        <button
          type="button"
          onClick={() => archive(!filed)}
          className="wc-lift min-h-11 rounded-control border border-rule px-4 text-[13px] font-medium"
        >
          {filed ? 'นำกลับมาใช้' : 'เก็บเข้าคลัง'}
        </button>
      </div>
    </div>
  )
}
