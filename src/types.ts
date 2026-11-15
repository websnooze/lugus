export type VideoOutputFormat = 'mp4' | 'hevc' | 'mov' | 'webm' | 'mkv' | 'gif' | 'mp3'
export type ImageOutputFormat =
  | 'jpg'
  | 'png'
  | 'webp'
  | 'heic'
  | 'avif'
  | 'tiff'
  | 'bmp'
  | 'gif'
  | 'jxl'
  | 'jp2'

export type OutputFormat = VideoOutputFormat | ImageOutputFormat
export type MediaKind = 'video' | 'image'
export type QualityPreset = 'high' | 'balanced' | 'small'
export type AppStatus = 'idle' | 'probing' | 'ready' | 'converting' | 'done' | 'error'

export interface VideoInfo {
  path: string
  name: string
  kind: MediaKind
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

export const VIDEO_FORMAT_OPTIONS: { id: VideoOutputFormat }[] = [
  { id: 'mp4' },
  { id: 'hevc' },
  { id: 'mov' },
  { id: 'webm' },
  { id: 'mkv' },
  { id: 'gif' },
  { id: 'mp3' },
]

export const IMAGE_FORMAT_OPTIONS: { id: ImageOutputFormat }[] = [
  { id: 'jpg' },
  { id: 'png' },
  { id: 'webp' },
  { id: 'heic' },
  { id: 'avif' },
  { id: 'tiff' },
  { id: 'bmp' },
  { id: 'gif' },
  { id: 'jxl' },
  { id: 'jp2' },
]

/** @deprecated Prefer VIDEO_FORMAT_OPTIONS / IMAGE_FORMAT_OPTIONS */
export const FORMAT_OPTIONS = VIDEO_FORMAT_OPTIONS

export function isVideoFormat(format: OutputFormat): format is VideoOutputFormat {
  return VIDEO_FORMAT_OPTIONS.some((o) => o.id === format)
}

export function isImageFormat(format: OutputFormat): format is ImageOutputFormat {
  return IMAGE_FORMAT_OPTIONS.some((o) => o.id === format)
}

export function defaultFormatForKind(kind: MediaKind): OutputFormat {
  return kind === 'image' ? 'png' : 'mp4'
}

export function formatsForKind(kind: MediaKind): { id: OutputFormat }[] {
  return kind === 'image' ? IMAGE_FORMAT_OPTIONS : VIDEO_FORMAT_OPTIONS
}
