import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './routes/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Sprint 1 replaces this with the authenticated shell. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
