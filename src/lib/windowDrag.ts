import { getCurrentWindow } from '@tauri-apps/api/window'
import type { PointerEvent as ReactPointerEvent } from 'react'

/** Démarre le drag fenêtre Tauri (fiable quand -webkit-app-region échoue). */
export function startWindowDrag(event: ReactPointerEvent | PointerEvent) {
  if (event.button !== 0) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('button, a, input, textarea, select, [data-no-window-drag]')) {
    return
  }
  void getCurrentWindow().startDragging()
}
