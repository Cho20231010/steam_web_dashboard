import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './theme.css'

const THEME_STORAGE_KEY = 'steam-dashboard-theme'

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)

if (savedTheme === '다크 모드') {
  document.documentElement.classList.add('theme-dark')
} else {
  document.documentElement.classList.remove('theme-dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
