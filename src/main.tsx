import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { Toaster } from 'sonner'   // ðŸ‘ˆ ajout

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster richColors position="top-center" />  {/* ðŸ‘ˆ ajout */}
  </StrictMode>,
)

