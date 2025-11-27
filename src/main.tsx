// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// This single line is the nuclear fix for the flash
if (import.meta.env.DEV) {
  // @vite-ignore — forces Vite to treat this as static
  const root = document.getElementById('root')
  if (root) {
    root.classList.add('loaded')
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)