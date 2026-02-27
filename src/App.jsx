// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { ClientJukebox } from './screens/ClientJukebox'
import { HostPlayer } from './screens/HostPlayer'
import { Admin } from './screens/Admin' // <--- 1. Importar el componente

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/host" replace />} />
      <Route path="/client" element={<ClientJukebox />} />
      <Route path="/host" element={<HostPlayer />} />

      {/* 2. Agregar la nueva ruta */}
      <Route path="/admin" element={<Admin />} />

      {/* Esta es la ruta que te estaba redirigiendo antes */}
      <Route path="*" element={<Navigate to="/host" replace />} />
    </Routes>
  )
}
