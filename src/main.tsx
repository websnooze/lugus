import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import './i18n'
import './index.css'
import { applyDarkTheme } from './store/preferences'

applyDarkTheme()

/** Pas de menu contextuel / inspect / raccourcis DevTools. */
document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

document.addEventListener(
  'keydown',
  (event) => {
    const key = event.key.toLowerCase()
    const meta = event.metaKey || event.ctrlKey
    const isDevtoolsShortcut =
      key === 'f12' ||
      (meta && event.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (meta && event.altKey && (key === 'i' || key === 'j' || key === 'c'))
    if (isDevtoolsShortcut) {
      event.preventDefault()
      event.stopPropagation()
    }
  },
  true,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
