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
  const selected = await open({
    multiple: false,
    title: 'Choisir une vidéo',
    filters: [
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
    ],
  })

  return typeof selected === 'string' ? selected : null
}

export async function pickOutputPath(
  defaultPath: string,
  format: OutputFormat,
): Promise<string | null> {
  const extension = format === 'hevc' ? 'mp4' : format
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

export type { ConversionProgress }
