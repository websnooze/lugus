import { Image } from '@tauri-apps/api/image'
import { resolveResource } from '@tauri-apps/api/path'

async function loadTrayIcon(name: 'tray-idle.png' | 'tray-recording.png'): Promise<Image> {
  const path = await resolveResource(`icons/${name}`)
  return Image.fromPath(path)
}

/** Icône tray idle (template macOS, monochrome). */
export async function createIdleTrayIcon(): Promise<Image> {
  return loadTrayIcon('tray-idle.png')
}

/** Icône tray recording (rouge, non-template). */
export async function createRecordingTrayIcon(): Promise<Image> {
  return loadTrayIcon('tray-recording.png')
}
