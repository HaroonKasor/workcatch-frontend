import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ProjectSettings } from '../components/ProjectSettings'
import { Skeleton as Block, SkeletonRows, SkeletonScreen } from '../components/Skeleton'
import { TaskRow } from '../components/TaskRow'
import { useToast } from '../components/Toast'
import { useDeleteProject, useLineStatus, useNotes, useProjects, useRestoreProject, useTasks } from '../lib/api'
import { noteCategoryLabel, projectDot, statusLabel } from '../lib/style'
import { byUrgency } from '../lib/time'
import type { Note } from '../lib/types'
import { ListGroup, TaskSwipeRow } from '../components/mobile/SwipeRow'
import { useRowActions } from '../components/mobile/useRowActions'
import { MobileBack } from '../components/mobile/MobileHeader'
import { useNow } from '../lib/useNow'

/**
 * /app/projects/:id — Figma v2 423:1418.
 *
 * A project's own page: how far along it is, its work, the notes filed with it,
 * and its settings, with the two decisions about the project itself — edit,
 * delete — beside them rather than on every card in the grid.
 */
type Tab = 'tasks' | 'notes' | 'settings'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projects = useProjects()
  const tasks = useTasks()
  const notes = useNotes()
  const line = useLineStatus()
  const remove = useDeleteProject()
  const restore = useRestoreProject()
  const toast = useToast()
  const now = useNow()
  const [tab, setTab] = useState<Tab>('tasks')
  const rowActions = useRowActions()
  const [confirming, setConfirming] = useState(false)

  if (projects.isPending || tasks.isPending) {
    return (
      <SkeletonScreen label="กำลังโหลดโปรเจกต์">
        <Block w="160px" h="12px" />
        <Block w="280px" h="32px" className="mt-3" />
        <Block w="100%" h="6px" className="mt-8" />
        <SkeletonRows rows={4} className="mt-12" />
      </SkeletonScreen>
    )
  }

  const project = projects.data?.find((p) => p.id === id)
  if (!project) {
    return (
      <div className="rounded-sheet border border-rule bg-sheet px-7 py-11">
        <p className="t-section">ไม่พบโปรเจกต์นี้</p>
        <Link to="/app/projects" className="wc-lift mt-5 inline-flex min-h-11 items-center rounded-control border border-rule px-4 text-[13px] font-medium">
          ไปที่หน้าโปรเจกต์
        </Link>
      </div>
    )
  }

  const mine = (tasks.data ?? []).filter((t) => t.project?.id === project.id && t.status !== 'CANCELLED')
  const open = mine.filter((t) => t.status !== 'DONE').sort((a, b) => byUrgency(a, b, now))
  const done = mine.filter((t) => t.status === 'DONE')
  const related = (notes.data ?? []).filter((n) => n.projectId === project.id)
  const progress = mine.length > 0 ? (done.length / mine.length) * 100 : 0

  return (
    <>
      <div className="-mx-5 lg:hidden"><MobileBack to="/app/projects" label="โปรเจกต์" /></div>
      <nav aria-label="breadcrumb" className="text-[12px] text-ink-3 max-lg:hidden">
        <Link to="/app/projects" className="hover:underline">โปรเจกต์</Link>
        <span aria-hidden>  ›  </span>
        <span>{project.name}</span>
      </nav>
      <h1 className="mt-1.5 flex items-center gap-2.5 font-display text-[26px] font-medium leading-[1.3]">
        <span className={`size-[9px] shrink-0 rounded-full ${projectDot[project.color]}`} aria-hidden />
        <span className="min-w-0 break-words">{project.name}</span>
        {project.archivedAt && <span className="t-caption shrink-0 text-ink-3">เก็บเข้าคลัง</span>}
      </h1>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,744px)_344px] xl:justify-between">
        <div className="min-w-0">
          <div className="h-1.5 w-full rounded-[3px] bg-rule-soft" role="progressbar" aria-valuenow={done.length} aria-valuemin={0} aria-valuemax={mine.length} aria-label="ความคืบหน้า">
            <div className="h-full rounded-[3px] bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-ink-3 max-lg:hidden">เสร็จแล้ว {done.length} จาก {mine.length}</p>
          <p className="mt-1.5 text-right font-mono text-[14px] text-ink-3 lg:hidden">{done.length}/{mine.length}</p>

          <div role="tablist" aria-label="ส่วนของโปรเจกต์" className="mt-8 flex gap-7 border-b border-rule-soft max-lg:mt-4 max-lg:grid max-lg:grid-cols-3 max-lg:gap-0 max-lg:rounded-control max-lg:border-0 max-lg:bg-ground max-lg:p-1">
            {([['tasks', 'งานในโปรเจกต์'], ['notes', 'บันทึกที่เกี่ยวข้อง'], ['settings', 'ตั้งค่าโปรเจกต์']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px min-h-11 border-b-2 pt-1.5 pb-2.5 text-[12.5px] max-lg:mb-0 max-lg:rounded-[6px] max-lg:border-0 max-lg:py-2 max-lg:text-[15px] ${
                  tab === key ? 'border-ink font-semibold text-ink max-lg:bg-sheet' : 'border-transparent font-medium text-ink-3 hover:text-ink-2'
                }`}
              >
                <span className="lg:hidden">{key === 'tasks' ? 'งาน' : key === 'notes' ? 'บันทึก' : 'ตั้งค่า'}</span>
                <span className="max-lg:hidden">{label}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" className="mt-4">
            {tab === 'tasks' && (
              <div className="-mx-5 -mt-4 lg:hidden">
                <ListGroup label="ค้างอยู่" count={open.length}>
                  {open.map((t) => <TaskSwipeRow key={t.id} task={t} now={now} actions={rowActions} meta={[statusLabel[t.status], t.requester].filter(Boolean).join(' · ')} />)}
                </ListGroup>
                {done.length > 0 && (
                  <ListGroup label="เสร็จแล้ว" count={done.length}>
                    {done.map((t) => <TaskSwipeRow key={t.id} task={t} now={now} actions={rowActions} done swipe={false} meta={statusLabel[t.status]} />)}
                  </ListGroup>
                )}
                {rowActions.sheet}
              </div>
            )}
            {tab === 'tasks' && (
              open.length === 0 ? (
                <p className="rounded-sheet border border-rule-soft bg-sheet px-5 py-6 text-[13px] text-ink-3 max-lg:hidden">
                  ไม่มีงานค้างในโปรเจกต์นี้{done.length > 0 ? ` · เสร็จแล้ว ${done.length} งาน` : ''}
                </p>
              ) : (
                <div className="@container overflow-hidden rounded-sheet border border-rule-soft bg-sheet max-lg:hidden">
                  {open.map((t, i) => <TaskRow key={t.id} task={t} now={now} last={i === open.length - 1} />)}
                </div>
              )
            )}
            {tab === 'notes' && <NotesList notes={related} />}
            {tab === 'settings' && <ProjectSettings key={project.id} project={project} />}
          </div>
        </div>

        <aside className="min-w-0">
          <p className="text-[12px] font-medium text-ink-3">บันทึกที่เกี่ยวข้อง</p>
          <div className="mt-2.5">
            <NotesList notes={related.slice(0, 3)} compact />
          </div>

          <p className="mt-6 text-[12px] font-medium text-ink-3">การเตือนของโปรเจกต์นี้</p>
          <div className="mt-2.5 flex flex-col gap-2 rounded-sheet border border-rule-soft bg-sheet p-4 text-[12.5px] text-ink-2">
            <p>ก่อนครบกำหนด 1 วัน และ 2 ชั่วโมง</p>
            <p>สรุปงานค้างในกล่องรับงานวันละครั้ง 09:00</p>
            <p>ส่งผ่าน LINE{line.data ? ` · 30 วันที่ผ่านมาส่งไป ${line.data.usage.sentLast30Days} ข้อความ` : ''}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab('settings')} className="wc-lift min-h-11 rounded-control border border-rule px-3.5 text-[13px] font-medium text-ink-2">
              แก้ไขโปรเจกต์
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="wc-lift min-h-11 rounded-control border border-error px-3.5 text-[13px] font-medium text-error">
              ลบโปรเจกต์
            </button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="ลบโปรเจกต์นี้"
        subject={project.name}
        body="งานไม่ถูกลบ และกู้คืนโปรเจกต์ได้ภายใน 30 วันจาก “โปรเจกต์ที่ลบ” ท้ายหน้าโปรเจกต์ งานจะกลับเข้าโปรเจกต์เดิม"
        consequences={[
          `งาน ${mine.length} รายการ จะไม่มีโปรเจกต์กำกับจนกว่าจะกู้คืน`,
          `บันทึก ${related.length} รายการ จะถูกยกเลิกการเชื่อม และไม่กลับมาเมื่อกู้คืน`,
          'การเตือนที่ตั้งไว้ยังทำงานตามเดิม',
          'เกิน 30 วันโปรเจกต์จะถูกลบถาวร งานยังอยู่แต่ไม่มีโปรเจกต์',
        ]}
        confirmLabel="ลบโปรเจกต์"
        cancelLabel="ไม่ลบ"
        destructive
        onConfirm={() => {
          remove.mutate(project.id)
          toast({
            title: 'ลบโปรเจกต์แล้ว',
            body: `${project.name} · กู้คืนได้ภายใน 30 วัน งาน ${mine.length} รายการจะกลับเข้าโปรเจกต์`,
            action: { label: 'กู้คืน', onAct: () => restore.mutate(project.id) },
          })
          navigate('/app/projects')
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

function NotesList({ notes, compact }: { notes: Note[]; compact?: boolean }) {
  if (notes.length === 0) {
    return (
      <p className={`rounded-sheet border border-rule-soft bg-sheet text-[13px] text-ink-3 ${compact ? 'px-5 py-4' : 'px-5 py-6'}`}>
        ยังไม่มีบันทึกในโปรเจกต์นี้
      </p>
    )
  }
  return (
    <ul className="rounded-sheet border border-rule bg-sheet px-5 py-1">
      {notes.map((n, i) => (
        <li key={n.id} className={i < notes.length - 1 ? 'border-b border-rule-soft' : ''}>
          <Link to={`/app/notes/${n.id}`} className="block py-3.5 hover:underline">
            <span className="block text-[13px]">{n.title}</span>
            <span className="mt-0.5 block text-[12px] text-ink-3">{noteCategoryLabel[n.category]}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
