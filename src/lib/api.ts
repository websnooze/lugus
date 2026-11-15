import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'

import type { ConversionProgress, OutputFormat, QualityPreset, VideoInfo } from '../types'

export async function checkFfmpeg(): Promise<string> {
  return invoke<string>('check_ffmpeg')
}

export async function probeVideo(path: string): Promise<VideoInfo> {
  return invoke<VideoInfo>('probe_video', { path })
}

export async function suggestOutputPath(inputPath: string, format: OutputFormat): Promise<string> {
  return invoke<string>('suggest_output_path', { inputPath, format })
}

export async function convertVideo(options: {
  inputPath: string
  outputPath?: string
  format: OutputFormat
  quality: QualityPreset
}): Promise<string> {
  return invoke<string>('convert_video', {
    request: {
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      format: options.format,
      quality: options.quality,
    },
  })
}

export async function cancelConversion(): Promise<void> {
  await invoke('cancel_conversion')
}

export async function pickVideoFile(): Promise<string | null> {
  return pickMediaFile()
}

export async function pickMediaFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    title: 'Choisir un fichier',
    filters: [
      {
        name: 'Média',
        extensions: [
          'mp4',
          'mov',
          'mkv',
          'webm',
          'avi',
          'm4v',
          'wmv',
          'flv',
          'mpeg',
          'mpg',
          'ts',
          'mts',
          'jpg',
          'jpeg',
          'png',
          'webp',
          'heic',
          'heif',
          'avif',
          'tif',
          'tiff',
          'bmp',
          'gif',
          'jxl',
          'jp2',
          'psd',
          'tga',
        ],
      },
      {
        name: 'Vidéo',
        extensions: [
          'mp4',
          'mov',
          'mkv',
          'webm',
          'avi',
          'm4v',
          'wmv',
          'flv',
          'mpeg',
          'mpg',
          'ts',
          'mts',
        ],
      },
      {
        name: 'Image',
        extensions: [
          'jpg',
          'jpeg',
          'png',
          'webp',
          'heic',
          'heif',
          'avif',
          'tif',
          'tiff',
          'bmp',
          'gif',
          'jxl',
          'jp2',
          'psd',
          'tga',
        ],
      },
    ],
  })

  return typeof selected === 'string' ? selected : null
}

export async function pickOutputPath(
  defaultPath: string,
  format: OutputFormat,
): Promise<string | null> {
  const extension =
    format === 'hevc' ? 'mp4' : format === 'jpeg' ? 'jpg' : format === 'heif' ? 'heic' : format
  const selected = await save({
    title: 'Enregistrer sous',
    defaultPath,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  })

  return selected
}

export async function revealInFinder(path: string): Promise<void> {
  await revealItemInDir(path)
}

export interface DisplayInfo {
  id: number
  name: string
  width: number
  height: number
  x: number
  y: number
  scale: number
  isMain: boolean
  ffmpegIndex: number
}

export interface WindowInfo {
  id: number
  title: string
  owner: string
  width: number
  height: number
  x: number
  y: number
}

export interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
}

export async function listDisplays(): Promise<DisplayInfo[]> {
  return invoke<DisplayInfo[]>('list_displays')
}

export async function listWindows(): Promise<WindowInfo[]> {
  return invoke<WindowInfo[]>('list_windows')
}

export async function startRecording(request: {
  mode: 'display' | 'window' | 'region'
  fps: number
  displayId?: number
  windowId?: number
  region?: CaptureRegion
  showCursor: boolean
}): Promise<{ outputPath: string }> {
  return invoke('start_recording', { request })
}

export async function stopRecording(): Promise<string> {
  return invoke<string>('stop_recording')
}

export async function isRecording(): Promise<boolean> {
  return invoke<boolean>('is_recording')
}

export async function takeScreenshot(request: {
  mode: 'display' | 'window' | 'region'
  displayId?: number
  windowId?: number
  region?: CaptureRegion
  showCursor: boolean
}): Promise<{ outputPath: string }> {
  return invoke('take_screenshot', { request })
}

export async function openRegionPicker(displayId?: number): Promise<void> {
  await invoke('open_region_picker', { displayId: displayId ?? null })
}

export async function closeRegionPicker(): Promise<void> {
  await invoke('close_region_picker')
}

export async function confirmRegion(
  region: CaptureRegion,
  displayId: number,
  scale: number,
): Promise<void> {
  await invoke('confirm_region', { region, displayId, scale })
}

export type { ConversionProgress }
