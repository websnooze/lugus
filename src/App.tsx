import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

import { ActionBar } from './components/ActionBar'
import { DropZone } from './components/DropZone'
import { Navbar } from './components/Navbar'
import { OptionsPanel } from './components/OptionsPanel'
import { RecorderOverlay } from './components/RecorderOverlay'
import { RegionPicker } from './components/RegionPicker'
import { SettingsScreen } from './components/SettingsScreen'
import { WelcomeScreen } from './components/WelcomeScreen'
import { useAutostartSync } from './hooks/useAutostart'
import { useGlobalHotkey } from './hooks/useGlobalHotkey'
import { useThemeSync } from './hooks/useThemeSync'
import { useTrayMenu } from './hooks/useTrayMenu'
import { useWindowChrome } from './hooks/useWindowChrome'
import { useConverterStore } from './store/converter'
import { usePreferencesStore } from './store/preferences'
import type { ConversionProgress } from './types'

export default function App() {
  useThemeSync()

  const [windowLabel, setWindowLabel] = useState('main')
  const init = useConverterStore((s) => s.init)
  const setProgress = useConverterStore((s) => s.setProgress)
  const view = usePreferencesStore((s) => s.view)
  const isMainWindow = windowLabel !== 'region-picker'

  useAutostartSync(isMainWindow)
  useGlobalHotkey(isMainWindow)
  useTrayMenu(isMainWindow)
  useWindowChrome(isMainWindow)

  useEffect(() => {
    try {
      setWindowLabel(getCurrentWindow().label)
    } catch {
      setWindowLabel('main')
    }
  }, [])

  useEffect(() => {
    if (windowLabel === 'region-picker') return
    void init()
  }, [init, windowLabel])

  useEffect(() => {
    if (windowLabel === 'region-picker') return
    let unlisten: (() => void) | undefined

    void listen<ConversionProgress>('conversion-progress', (event) => {
      setProgress(event.payload)
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [setProgress, windowLabel])

  if (windowLabel === 'region-picker') {
    return <RegionPicker />
  }

  if (view === 'recorder') {
    return (
      <div className="h-dvh overflow-hidden text-foreground">
        <RecorderOverlay />
      </div>
    )
  }

  return (
    <div className="app-shell relative text-foreground">
      <Navbar />

      {view === 'settings' ? (
        <SettingsScreen />
      ) : view === 'welcome' ? (
        <WelcomeScreen />
      ) : (
        <main className="grid gap-5 px-7 pb-8 pt-2 lg:grid-cols-[1.15fr_0.85fr]">
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
