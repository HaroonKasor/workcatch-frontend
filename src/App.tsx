import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import AppLayout from './components/AppLayout'
import AdminAuditLogs from './routes/admin/AuditLogs'
import AdminNotifications from './routes/admin/Notifications'
import AdminOverview from './routes/admin/Overview'
import AdminSettings from './routes/admin/Settings'
import AdminUsers from './routes/admin/Users'
import Board from './routes/Board'
import Calendar from './routes/Calendar'
import Dashboard from './routes/Dashboard'
import Inbox from './routes/Inbox'
import Login from './routes/Login'
import Notifications from './routes/Notifications'
import Projects from './routes/Projects'
import Settings from './routes/Settings'
import TaskDetail from './routes/TaskDetail'
import Tasks from './routes/Tasks'
import Upgrade from './routes/Upgrade'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="board" element={<Board />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<Projects />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="upgrade" element={<Upgrade />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
