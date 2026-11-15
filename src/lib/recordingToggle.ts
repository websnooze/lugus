import { getCurrentWindow } from '@tauri-apps/api/window'

import { usePreferencesStore } from '../store/preferences'
import { useRecorderStore } from '../store/recorder'

/** Affiche la fenêtre principale et bascule l’enregistrement d’écran. */
export async function toggleScreenRecording() {
  const status = useRecorderStore.getState().status

  // Pendant un record, ne pas réafficher l’overlay avant l’arrêt
  // (sinon le cadre / les widgets entrent dans les dernières frames).
  if (status === 'recording') {
    await useRecorderStore.getState().stop()
    return
  }

  if (status === 'countdown') {
    useRecorderStore.getState().reset()
    await showMainWindow()
    return
  }

  usePreferencesStore.getState().setView('recorder')
  await showMainWindow()

  if (status === 'idle' || status === 'error') {
    await useRecorderStore.getState().refreshSources()
    await useRecorderStore.getState().begin()
  }
}

export async function showMainWindow() {
  try {
    const window = getCurrentWindow()
    await window.show()
    await window.unminimize()
    await window.setFocus()
  } catch {
    // ignore
  }
}

export async function hideMainWindow() {
  try {
    await getCurrentWindow().hide()
  } catch {
    // ignore
  }
}
