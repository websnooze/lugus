import { useEffect } from 'react'

import { applyWindowChrome } from '../lib/windowMode'
import { usePreferencesStore } from '../store/preferences'

/** Synchronise la fenêtre native avec la vue (app / overlay plein écran). */
export function useWindowChrome(enabled: boolean) {
  const view = usePreferencesStore((s) => s.view)

  useEffect(() => {
    if (!enabled) return

    if (view !== 'recorder') {
      void applyWindowChrome('app')
      return
    }

    // Reste en overlay plein écran pendant l’enregistrement (pas de HUD réduit).
    void applyWindowChrome('overlay')
  }, [enabled, view])
}
