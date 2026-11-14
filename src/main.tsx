import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import './i18n'
import './index.css'
import { applyTheme, usePreferencesStore } from './store/preferences'

applyTheme(usePreferencesStore.getState().themeMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
