import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { OutputFormat, QualityPreset } from '../types'

export interface ConversionPreset {
  id: string
  name: string
  format: OutputFormat
  quality: QualityPreset
  createdAt: number
  updatedAt: number
}

interface PresetsState {
  presets: ConversionPreset[]
  activePresetId: string | null
  addPreset: (input: { name: string; format: OutputFormat; quality: QualityPreset }) => void
  renamePreset: (id: string, name: string) => void
  deletePreset: (id: string) => void
  setActivePresetId: (id: string | null) => void
}

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      addPreset: ({ name, format, quality }) => {
        const trimmed = name.trim()
        if (!trimmed) return

        const now = Date.now()
        const preset: ConversionPreset = {
          id: crypto.randomUUID(),
          name: trimmed,
          format,
          quality,
          createdAt: now,
          updatedAt: now,
        }

        set({
          presets: [preset, ...get().presets],
          activePresetId: preset.id,
        })
      },

      renamePreset: (id, name) => {
        const trimmed = name.trim()
        if (!trimmed) return

        set({
          presets: get().presets.map((preset) =>
            preset.id === id
              ? { ...preset, name: trimmed, updatedAt: Date.now() }
              : preset,
          ),
        })
      },

      deletePreset: (id) => {
        const { presets, activePresetId } = get()
        set({
          presets: presets.filter((preset) => preset.id !== id),
          activePresetId: activePresetId === id ? null : activePresetId,
        })
      },

      setActivePresetId: (id) => set({ activePresetId: id }),
    }),
    {
      name: 'vc-presets',
    },
  ),
)
