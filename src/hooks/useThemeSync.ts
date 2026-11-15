import { useEffect } from 'react'

import { applyDarkTheme } from '../store/preferences'

/** Force le dark mode au montage (indépendant du thème système). */
export function useThemeSync() {
  useEffect(() => {
    applyDarkTheme()
  }, [])
}
