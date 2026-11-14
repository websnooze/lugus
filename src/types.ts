export type OutputFormat = 'mp4' | 'hevc' | 'mov' | 'webm' | 'mkv' | 'gif' | 'mp3'
export type QualityPreset = 'high' | 'balanced' | 'small'
export type AppStatus = 'idle' | 'probing' | 'ready' | 'converting' | 'done' | 'error'

export interface VideoInfo {
  path: string
  name: string
  duration: number
  width: number
  height: number
  sizeBytes: number
  videoCodec?: string | null
  audioCodec?: string | null
}

export interface ConversionProgress {
  percent: number
  timeSecs: number
  speed?: string | null
}

export const FORMAT_OPTIONS: { id: OutputFormat }[] = [
  { id: 'mp4' },
  { id: 'hevc' },
  { id: 'mov' },
  { id: 'webm' },
  { id: 'mkv' },
  { id: 'gif' },
  { id: 'mp3' },
]
