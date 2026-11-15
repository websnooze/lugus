import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import i18n, { type AppLanguage } from '../i18n'
import { DEFAULT_RECORDING_HOTKEY } from '../lib/hotkey'

export type AppView = 'welcome' | 'home' | 'recorder' | 'settings'

interface PreferencesState {
  language: AppLanguage
  view: AppView
  launchAtLogin: boolean
  recordingHotkey: string
  hotkeyCaptureActive: boolean
  setLanguage: (language: AppLanguage) => void
  setView: (view: AppView) => void
  setLaunchAtLogin: (value: boolean) => void
  setRecordingHotkey: (hotkey: string) => void
  setHotkeyCaptureActive: (value: boolean) => void
}

/** Dark only — ignore le thème système. */
export function applyDarkTheme() {
  const root = document.documentElement
  root.classList.remove('light')
  root.classList.add('dark')
  root.setAttribute('data-theme', 'dark')
  root.style.colorScheme = 'dark'
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'en',
      view: 'welcome',
      launchAtLogin: true,
      recordingHotkey: DEFAULT_RECORDING_HOTKEY,
      hotkeyCaptureActive: false,

      setLanguage: (language) => {
        void i18n.changeLanguage(language)
        set({ language })
      },

      setView: (view) => set({ view }),

      setLaunchAtLogin: (launchAtLogin) => set({ launchAtLogin }),

      setRecordingHotkey: (recordingHotkey) => set({ recordingHotkey }),

      setHotkeyCaptureActive: (hotkeyCaptureActive) => set({ hotkeyCaptureActive }),
    }),
    {
      name: 'vc-preferences',
      partialize: (state) => ({
        language: state.language,
        launchAtLogin: state.launchAtLogin,
        recordingHotkey: state.recordingHotkey,
      }),
      onRehydrateStorage: () => (state) => {
        applyDarkTheme()
        if (!state) return
        void i18n.changeLanguage(state.language)
        if (!state.recordingHotkey) {
          state.setRecordingHotkey(DEFAULT_RECORDING_HOTKEY)
        }
      },
    },
  ),
)
