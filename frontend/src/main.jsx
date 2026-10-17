import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@raydenui/ui/styles.css'
import '@raydenui/ui/fonts.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
