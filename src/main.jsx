import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router/AppRouter'
import { ToastProvider } from './components/ui/ToastProvider' // AJUSTA RUTA
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter basename="/rockola">
        <AppRouter />
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>,
)
