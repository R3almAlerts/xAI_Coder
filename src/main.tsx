// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Instantly mark as loaded — triggers fade-in
const root = document.getElementById('root')
if (root) {
  root.setAttribute('data-loaded', 'true')
}

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)