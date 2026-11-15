import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { useEffect, useRef } from 'react'

import { toggleScreenRecording } from '../lib/recordingToggle'
import { usePreferencesStore } from '../store/preferences'

/**
 * Enregistre le raccourci global pour toggle l’enregistrement d’écran.
 */
export function useGlobalHotkey(enabled: boolean) {
  const hotkey = usePreferencesStore((s) => s.recordingHotkey)
  const capturing = usePreferencesStore((s) => s.hotkeyCaptureActive)
  const handlerRef = useRef<() => void>(() => undefined)

  handlerRef.current = () => {
    void toggleScreenRecording()
  }

  useEffect(() => {
    if (!enabled || !hotkey || capturing) {
      void unregisterAll().catch(() => undefined)
      return
    }

    let active = true
    let registered = ''

    const setup = async () => {
      try {
        await unregisterAll()
        if (!active) return
        await register(hotkey, (event) => {
          if (event.state === 'Pressed') {
            handlerRef.current()
          }
        })
        registered = hotkey
      } catch (error) {
        console.error('Failed to register global hotkey', error)
      }
    }

    void setup()

    return () => {
      active = false
      if (registered) {
        void unregister(registered).catch(() => undefined)
      }
    }
  }, [capturing, enabled, hotkey])
}
