import { useEffect } from 'react'

import { applyTheme, usePreferencesStore } from '../store/preferences'

/** Applique le thème et suit les changements système si mode = system. */
export function useThemeSync() {
  const themeMode = usePreferencesStore((s) => s.themeMode)

  useEffect(() => {
    applyTheme(themeMode)

    if (themeMode !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [themeMode])
}
