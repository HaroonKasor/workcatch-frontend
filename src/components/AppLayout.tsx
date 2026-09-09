import { Outlet } from 'react-router-dom'
import { AppRail } from './AppRail'
import { useProjects, useTasks } from '../lib/api'
import { timeStateOf } from '../lib/time'

export default function AppLayout() {
  const tasks = useTasks()
  const projects = useProjects()
  const now = new Date()
  const all = tasks.data ?? []

  const counts = {
    inbox: all.filter((t) => t.status === 'INBOX').length,
    overdue: all.filter((t) => timeStateOf(t, now) === 'late').length,
    open: all.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    waiting: all.filter((t) => t.status === 'WAITING').length,
  }

  return (
    <div className="flex min-h-dvh bg-ground">
      {/* Desktop only. Mobile gets a bottom tab bar in Sprint 5. */}
      <div className="hidden lg:block">
        <AppRail counts={counts} projects={projects.data ?? []} />
      </div>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-content px-5 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
