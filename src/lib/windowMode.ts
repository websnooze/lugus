import { invoke } from '@tauri-apps/api/core'
import {
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from '@tauri-apps/api/window'

export type WindowChrome = 'app' | 'overlay' | 'hud'

const APP_SIZE = { width: 980, height: 720 }
const APP_MIN = { width: 840, height: 640 }
const HUD_SIZE = { width: 380, height: 78 }

let currentChrome: WindowChrome | null = null

export function getWindowChrome() {
  return currentChrome
}

async function setNativeOverlayMode(enabled: boolean) {
  try {
    await invoke('set_macos_overlay_mode', {
      label: getCurrentWindow().label,
      enabled,
    })
  } catch (error) {
    console.error('Failed to set macOS overlay mode', error)
  }
}

/** Re-applique les flags Spaces après que AppKit ait fini de poser la fenêtre. */
async function setNativeOverlayModeSettled(enabled: boolean) {
  await setNativeOverlayMode(enabled)
  await new Promise((resolve) => setTimeout(resolve, 80))
  await setNativeOverlayMode(enabled)
}

/** Couvre l’écran courant sans entrer en mode fullscreen macOS (pas de Space dédié). */
async function coverCurrentDisplay() {
  const win = getCurrentWindow()
  await win.setFullscreen(false)

  const monitor = await currentMonitor()
  if (!monitor) {
    await win.maximize()
    return
  }

  const scale = monitor.scaleFactor || 1
  const width = monitor.size.width / scale
  const height = monitor.size.height / scale
  const x = monitor.position.x / scale
  const y = monitor.position.y / scale

  await win.setSize(new LogicalSize(width, height))
  await win.setPosition(new LogicalPosition(x, y))
}

/** Applique le chrome fenêtre selon le mode UI (app / overlay / HUD). */
export async function applyWindowChrome(mode: WindowChrome, force = false) {
  if (!force && currentChrome === mode) return

  try {
    const win = getCurrentWindow()

    if (mode === 'app') {
      document.documentElement.classList.remove('recorder-overlay', 'recorder-hud')
      await win.setFullscreen(false)
      await win.setVisibleOnAllWorkspaces(false)
      await setNativeOverlayMode(false)
      await win.setAlwaysOnTop(false)
      // Chrome custom (TitleBar + feux) — pas de décorations natives.
      await win.setDecorations(false)
      await win.setMinSize(new LogicalSize(APP_MIN.width, APP_MIN.height))
      await win.setSize(new LogicalSize(APP_SIZE.width, APP_SIZE.height))
      await win.center()
      await win.show()
      currentChrome = mode
      return
    }

    if (mode === 'overlay') {
      document.documentElement.classList.add('recorder-overlay')
      document.documentElement.classList.remove('recorder-hud')
      await win.setFullscreen(false)
      await win.setDecorations(false)
      await win.setAlwaysOnTop(true)
      await win.setMinSize(new LogicalSize(320, 200))
      await coverCurrentDisplay()
      await win.show()
      await win.setFocus()
      // Appliquer les flags Spaces en dernier (après show), sinon macOS les ignore.
      await setNativeOverlayModeSettled(true)
      currentChrome = mode
      return
    }

    // hud — petite barre, toujours au-dessus / tous les Spaces
    document.documentElement.classList.remove('recorder-overlay')
    document.documentElement.classList.add('recorder-hud')
    await win.setFullscreen(false)
    await win.setDecorations(false)
    await win.setAlwaysOnTop(true)
    await win.setMinSize(new LogicalSize(300, 64))
    await win.setSize(new LogicalSize(HUD_SIZE.width, HUD_SIZE.height))

    const monitor = await currentMonitor()
    if (monitor) {
      const scale = monitor.scaleFactor || 1
      const screenW = monitor.size.width / scale
      const screenH = monitor.size.height / scale
      const screenX = monitor.position.x / scale
      const screenY = monitor.position.y / scale
      const x = screenX + (screenW - HUD_SIZE.width) / 2
      const y = screenY + screenH - HUD_SIZE.height - 28
      await win.setPosition(new LogicalPosition(x, y))
    } else {
      await win.center()
    }

    await win.show()
    await win.setFocus()
    await setNativeOverlayModeSettled(true)
    currentChrome = mode
  } catch (error) {
    console.error('Failed to apply window chrome', error)
    currentChrome = null
  }
}
