import { create } from 'zustand'

import i18n from '../i18n'
import {
  listDisplays,
  listWindows,
  revealInFinder,
  startRecording,
  stopRecording,
  takeScreenshot,
  type CaptureRegion,
  type DisplayInfo,
  type WindowInfo,
} from '../lib/api'
import { applyWindowChrome } from '../lib/windowMode'
import { useConverterStore } from './converter'
import { usePreferencesStore } from './preferences'

async function applyWindowChromeSafe() {
  try {
    await applyWindowChrome('app')
  } catch {
    // ignore outside Tauri
  }
}

export type CaptureMode = 'display' | 'window' | 'region'
export type RecorderStatus =
  | 'idle'
  | 'countdown'
  | 'recording'
  | 'processing'
  | 'error'
export type CountdownOption = 0 | 3 | 5 | 10
export type FpsOption = 30 | 60 | 120

interface RecorderState {
  status: RecorderStatus
  mode: CaptureMode
  fps: FpsOption
  countdown: CountdownOption
  showCursor: boolean
  autoConvert: boolean
  displays: DisplayInfo[]
  windows: WindowInfo[]
  displayId: number | null
  windowId: number | null
  region: CaptureRegion | null
  /** Dessin de zone dans l’overlay (pas de fenêtre séparée). */
  pickingRegion: boolean
  countdownLeft: number
  recordingPath: string | null
  elapsedSecs: number
  error: string | null
  lastScreenshotPath: string | null
  refreshSources: () => Promise<void>
  setMode: (mode: CaptureMode) => void
  setFps: (fps: FpsOption) => void
  setCountdown: (countdown: CountdownOption) => void
  setShowCursor: (show: boolean) => void
  setAutoConvert: (value: boolean) => void
  setDisplayId: (id: number) => void
  setWindowId: (id: number) => void
  setRegion: (region: CaptureRegion | null) => void
  pickRegion: () => void
  cancelPickRegion: () => void
  confirmPickRegion: (css: CaptureRegion) => void
  begin: () => Promise<void>
  stop: () => Promise<void>
  captureScreenshot: () => Promise<void>
  tickCountdown: () => void
  tickElapsed: () => void
  reset: () => void
}

let countdownTimer: ReturnType<typeof setInterval> | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

function validateCapture(get: () => RecorderState): string | null {
  const { mode, region, windowId } = get()
  if (mode === 'region' && !region) return i18n.t('recorder.needRegion')
  if (mode === 'window' && !windowId) return i18n.t('recorder.needWindow')
  return null
}

async function launchRecording(
  get: () => RecorderState,
  set: (partial: Partial<RecorderState>) => void,
) {
  const state = get()
  try {
    const result = await startRecording({
      mode: state.mode,
      fps: state.fps,
      displayId: state.displayId ?? undefined,
      windowId: state.windowId ?? undefined,
      region: state.region ?? undefined,
      showCursor: state.showCursor,
    })
    set({
      status: 'recording',
      recordingPath: result.outputPath,
      elapsedSecs: 0,
      error: null,
    })
    elapsedTimer = setInterval(() => {
      get().tickElapsed()
    }, 1000)
  } catch (error) {
    set({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export const useRecorderStore = create<RecorderState>((set, get) => ({
  status: 'idle',
  mode: 'display',
  fps: 60,
  countdown: 3,
  showCursor: true,
  autoConvert: true,
  displays: [],
  windows: [],
  displayId: null,
  windowId: null,
  region: null,
  pickingRegion: false,
  countdownLeft: 0,
  recordingPath: null,
  elapsedSecs: 0,
  error: null,
  lastScreenshotPath: null,

  refreshSources: async () => {
    try {
      const [displays, windows] = await Promise.all([listDisplays(), listWindows()])
      const main = displays.find((d) => d.isMain) ?? displays[0] ?? null
      set({
        displays,
        windows,
        displayId: get().displayId ?? main?.id ?? null,
        windowId: get().windowId ?? windows[0]?.id ?? null,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },

  setMode: (mode) => set({ mode }),
  setFps: (fps) => set({ fps }),
  setCountdown: (countdown) => set({ countdown }),
  setShowCursor: (showCursor) => set({ showCursor }),
  setAutoConvert: (autoConvert) => set({ autoConvert }),
  setDisplayId: (displayId) => set({ displayId }),
  setWindowId: (windowId) => set({ windowId }),
  setRegion: (region) => set({ region, mode: region ? 'region' : get().mode }),

  pickRegion: () => {
    set({ pickingRegion: true, mode: 'region', error: null })
  },

  cancelPickRegion: () => set({ pickingRegion: false }),

  confirmPickRegion: (css) => {
    const { displayId, displays } = get()
    const display = displays.find((d) => d.id === displayId)
    const scale = display?.scale || window.devicePixelRatio || 2
    set({
      pickingRegion: false,
      mode: 'region',
      region: {
        x: Math.round(css.x * scale),
        y: Math.round(css.y * scale),
        width: Math.round(css.width * scale),
        height: Math.round(css.height * scale),
      },
    })
  },

  begin: async () => {
    clearTimers()
    const validation = validateCapture(get)
    if (validation) {
      set({ error: validation })
      return
    }

    const { countdown } = get()
    if (countdown > 0) {
      set({ status: 'countdown', countdownLeft: countdown, error: null })
      countdownTimer = setInterval(() => {
        get().tickCountdown()
      }, 1000)
      return
    }

    await launchRecording(get, set)
  },

  tickCountdown: () => {
    const left = get().countdownLeft - 1
    // Après « 1 », on lance sans jamais afficher 0.
    if (left <= 0) {
      clearTimers()
      void launchRecording(get, set)
      return
    }
    set({ countdownLeft: left })
  },

  tickElapsed: () => set({ elapsedSecs: get().elapsedSecs + 1 }),

  stop: async () => {
    clearTimers()
    const { recordingPath, autoConvert } = get()
    set({ status: 'processing' })

    try {
      await stopRecording()

      if (recordingPath) {
        await useConverterStore.getState().loadVideo(recordingPath)
        usePreferencesStore.getState().setView('home')
        await applyWindowChromeSafe()
        if (autoConvert) {
          await useConverterStore.getState().startConversion()
        }
      } else {
        usePreferencesStore.getState().setView('welcome')
        await applyWindowChromeSafe()
      }

      set({ status: 'idle', recordingPath: null, elapsedSecs: 0 })
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },

  captureScreenshot: async () => {
    const validation = validateCapture(get)
    if (validation) {
      set({ error: validation })
      return
    }

    const state = get()
    set({ error: null })
    try {
      const result = await takeScreenshot({
        mode: state.mode,
        displayId: state.displayId ?? undefined,
        windowId: state.windowId ?? undefined,
        region: state.region ?? undefined,
        showCursor: state.showCursor,
      })
      set({ lastScreenshotPath: result.outputPath })
      await revealInFinder(result.outputPath)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },

  reset: () => {
    clearTimers()
    set({
      status: 'idle',
      pickingRegion: false,
      countdownLeft: 0,
      recordingPath: null,
      elapsedSecs: 0,
      error: null,
    })
  },
}))
