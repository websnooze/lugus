import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import i18n, { type AppLanguage } from '../i18n'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppView = 'home' | 'settings'

interface PreferencesState {
  language: AppLanguage
  themeMode: ThemeMode
  view: AppView
  setLanguage: (language: AppLanguage) => void
  setThemeMode: (themeMode: ThemeMode) => void
  setView: (view: AppView) => void
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode)
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'en',
      themeMode: 'system',
      view: 'home',

      setLanguage: (language) => {
        void i18n.changeLanguage(language)
        set({ language })
      },

      setThemeMode: (themeMode) => {
        applyTheme(themeMode)
        set({ themeMode })
      },

      setView: (view) => set({ view }),
    }),
    {
      name: 'vc-preferences',
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        void i18n.changeLanguage(state.language)
        applyTheme(state.themeMode)
      },
    },
  ),
)
