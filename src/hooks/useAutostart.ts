import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useEffect } from 'react'

import { usePreferencesStore } from '../store/preferences'

/** Synchronise le toggle UI avec le statut réel LaunchAgent macOS. */
export function useAutostartSync(enabled: boolean) {
  const launchAtLogin = usePreferencesStore((s) => s.launchAtLogin)
  const setLaunchAtLogin = usePreferencesStore((s) => s.setLaunchAtLogin)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    void (async () => {
      try {
        const osEnabled = await isEnabled()
        // Préférence app = true par défaut : activer le LaunchAgent si besoin.
        if (launchAtLogin && !osEnabled) {
          await enable()
          return
        }
        if (!cancelled && osEnabled !== launchAtLogin) {
          setLaunchAtLogin(osEnabled)
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
    // Only sync once on mount against OS state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}

export async function applyLaunchAtLogin(next: boolean): Promise<void> {
  if (next) {
    await enable()
  } else {
    await disable()
  }
}
