import { Navigate, Route, Routes } from 'react-router-dom'
import { ClientJukebox } from '../screens/ClientJukebox'
import { HostPlayer } from '../screens/HostPlayer'

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/host" replace />} />
      <Route path="/client" element={<ClientJukebox />} />
      <Route path="/host" element={<HostPlayer />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/host" replace />} />
    </Routes>
  )
}
