import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ToastProvider } from './components/ui/ToastProvider' // AJUSTA RUTA
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter basename="/rockola">
        <App />
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>,
)
