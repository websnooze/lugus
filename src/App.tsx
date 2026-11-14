import { Toast } from '@heroui/react'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'

import { ActionBar } from './components/ActionBar'
import { DropZone } from './components/DropZone'
import { Navbar } from './components/Navbar'
import { OptionsPanel } from './components/OptionsPanel'
import { SettingsScreen } from './components/SettingsScreen'
import { useThemeSync } from './hooks/useThemeSync'
import { useConverterStore } from './store/converter'
import { usePreferencesStore } from './store/preferences'
import type { ConversionProgress } from './types'

export default function App() {
  useThemeSync()

  const init = useConverterStore((s) => s.init)
  const setProgress = useConverterStore((s) => s.setProgress)
  const view = usePreferencesStore((s) => s.view)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listen<ConversionProgress>('conversion-progress', (event) => {
      setProgress(event.payload)
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [setProgress])

  return (
    <div className="app-shell relative bg-background text-foreground">
      <Toast.Provider placement="top end" />
      <Navbar />

      {view === 'settings' ? (
        <SettingsScreen />
      ) : (
        <main className="grid gap-5 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <DropZone />
            <ActionBar />
          </div>
          <OptionsPanel />
        </main>
      )}
    </div>
  )
}
