import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import AppLayout from './components/AppLayout'
import AdminAuditLogs from './routes/admin/AuditLogs'
import AdminLineEvents from './routes/admin/LineEvents'
import AdminNotifications from './routes/admin/Notifications'
import AdminOverview from './routes/admin/Overview'
import AdminSettings from './routes/admin/Settings'
import AdminUsers from './routes/admin/Users'
import Board from './routes/Board'
import Calendar from './routes/Calendar'
import Dashboard from './routes/Dashboard'
import Inbox from './routes/Inbox'
import Landing from './routes/Landing'
import { Contact, Privacy, Terms } from './routes/Legal'
import Login from './routes/Login'
import NoteDetail from './routes/NoteDetail'
import NoteEdit from './routes/NoteEdit'
import Notes from './routes/Notes'
import NoteTrash from './routes/NoteTrash'
import Notifications from './routes/Notifications'
import Projects from './routes/Projects'
import ProjectDetail from './routes/ProjectDetail'
import NotFound from './routes/NotFound'
import ConnectLine from './routes/ConnectLine'
import Settings from './routes/Settings'
import TaskDetail from './routes/TaskDetail'
import Tasks from './routes/Tasks'
import Upgrade from './routes/Upgrade'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public. The front door is shown to everyone, signed in or not. */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="board" element={<Board />} />
          <Route path="notes" element={<Notes />} />
          {/* "new" and "trash" before ":id", or React Router reads them as a
              note whose id is "new". */}
          <Route path="notes/new" element={<NoteEdit />} />
          <Route path="notes/trash" element={<NoteTrash />} />
          <Route path="notes/:id" element={<NoteDetail />} />
          <Route path="notes/:id/edit" element={<NoteEdit />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          {/*
            projects/:id is the project's own page — Figma v2 423:1418: progress,
            its tasks, its notes and its settings. (An earlier projects/:id only
            re-rendered the grid for any id, which is why it was once removed.)
            An unknown id says so instead of showing something else.
          */}
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="upgrade" element={<Upgrade />} />
          <Route path="connect-line" element={<ConnectLine />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="line-events" element={<AdminLineEvents />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>

        {/* An unknown path asks the same question rather than assuming the
            visitor is signed in. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
