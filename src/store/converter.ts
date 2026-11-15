import { create } from 'zustand'

import {
  cancelConversion,
  checkFfmpeg,
  convertVideo,
  pickOutputPath,
  pickVideoFile,
  probeVideo,
  revealInFinder,
  suggestOutputPath,
} from '../lib/api'
import type {
  AppStatus,
  ConversionProgress,
  OutputFormat,
  QualityPreset,
  VideoInfo,
} from '../types'

interface ConverterState {
  ffmpegVersion: string | null
  ffmpegError: string | null
  status: AppStatus
  video: VideoInfo | null
  format: OutputFormat
  quality: QualityPreset
  outputPath: string | null
  progress: ConversionProgress
  error: string | null
  init: () => Promise<void>
  setFormat: (format: OutputFormat) => Promise<void>
  setQuality: (quality: QualityPreset) => void
  loadVideo: (path: string) => Promise<void>
  chooseVideo: () => Promise<void>
  chooseOutput: () => Promise<void>
  startConversion: () => Promise<void>
  stopConversion: () => Promise<void>
  setProgress: (progress: ConversionProgress) => void
  revealOutput: () => Promise<void>
  reset: () => void
}

const initialProgress: ConversionProgress = {
  percent: 0,
  timeSecs: 0,
  speed: null,
}

export const useConverterStore = create<ConverterState>((set, get) => ({
  ffmpegVersion: null,
  ffmpegError: null,
  status: 'idle',
  video: null,
  format: 'mp4',
  quality: 'balanced',
  outputPath: null,
  progress: initialProgress,
  error: null,

  init: async () => {
    try {
      const version = await checkFfmpeg()
      set({ ffmpegVersion: version, ffmpegError: null })
    } catch (error) {
      set({
        ffmpegVersion: null,
        ffmpegError: error instanceof Error ? error.message : String(error),
      })
    }
  },

  setFormat: async (format) => {
    const { video } = get()
    set({ format })
    if (!video) return
    const outputPath = await suggestOutputPath(video.path, format)
    set({ outputPath })
  },

  setQuality: (quality) => set({ quality }),

  loadVideo: async (path) => {
    set({ status: 'probing', error: null, progress: initialProgress, outputPath: null })
    try {
      const video = await probeVideo(path)
      const outputPath = await suggestOutputPath(path, get().format)
      set({ video, outputPath, status: 'ready' })
    } catch (error) {
      set({
        video: null,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },

  chooseVideo: async () => {
    const path = await pickVideoFile()
    if (!path) return
    await get().loadVideo(path)
  },

  chooseOutput: async () => {
    const { video, format, outputPath } = get()
    if (!video) return
    const suggested = outputPath ?? (await suggestOutputPath(video.path, format))
    const selected = await pickOutputPath(suggested, format)
    if (selected) set({ outputPath: selected })
  },

  startConversion: async () => {
    const { video, format, quality, outputPath, ffmpegError } = get()
    if (!video || ffmpegError) return

    set({
      status: 'converting',
      error: null,
      progress: initialProgress,
    })

    try {
      const result = await convertVideo({
        inputPath: video.path,
        outputPath: outputPath ?? undefined,
        format,
        quality,
      })
      set({
        status: 'done',
        outputPath: result,
        progress: { percent: 100, timeSecs: video.duration, speed: '1x' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.toLowerCase().includes('annul') || message.toLowerCase().includes('cancel')) {
        set({ status: 'ready', progress: initialProgress })
        return
      }
      set({ status: 'error', error: message })
    }
  },

  stopConversion: async () => {
    await cancelConversion()
    set({ status: 'ready', progress: initialProgress })
  },

  setProgress: (progress) => {
    if (get().status !== 'converting') return
    set({ progress })
  },

  revealOutput: async () => {
    const { outputPath } = get()
    if (!outputPath) return
    await revealInFinder(outputPath)
  },

  reset: () =>
    set({
      status: 'idle',
      video: null,
      outputPath: null,
      progress: initialProgress,
      error: null,
    }),
}))
