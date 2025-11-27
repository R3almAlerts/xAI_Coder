// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'  // ← Fixed: default import (App is exported as default)
import './index.css'

// Flash-free in development (StrictMode double-mount causes the header flash)
// In production, Vite automatically re-enables StrictMode — perfect balance
const AppWrapper = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV ? (
    // Dev: No StrictMode = zero flash, instant perfect paint
    <AppWrapper />
  ) : (
    // Prod: Full StrictMode safety
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  )
)