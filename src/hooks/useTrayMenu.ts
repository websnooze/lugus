import { exit } from '@tauri-apps/api/app'
import { Menu } from '@tauri-apps/api/menu'
import { TrayIcon } from '@tauri-apps/api/tray'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  hideMainWindow,
  showMainWindow,
  toggleScreenRecording,
} from '../lib/recordingToggle'
import { createIdleTrayIcon, createRecordingTrayIcon } from '../lib/trayIcons'
import { usePreferencesStore, type AppView } from '../store/preferences'
import { useRecorderStore } from '../store/recorder'

const TRAY_ID = 'main-tray'

/**
 * Tray macOS + menu contextuel (show, recorder, settings, quit…).
 * L’icône passe en rouge pendant l’enregistrement.
 */
export function useTrayMenu(enabled: boolean) {
  const { t, i18n } = useTranslation()
  const language = usePreferencesStore((s) => s.language)
  const setView = usePreferencesStore((s) => s.setView)
  const recorderStatus = useRecorderStore((s) => s.status)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const setup = async () => {
      const recordingActive =
        recorderStatus === 'recording' || recorderStatus === 'countdown'

      const openView = async (view: AppView) => {
        setView(view)
        await showMainWindow()
      }

      const menu = await Menu.new({
        items: [
          {
            id: 'tray-show',
            text: t('tray.show'),
            action: () => {
              void openView('welcome')
            },
          },
          {
            id: 'tray-hide',
            text: t('tray.hide'),
            action: () => {
              void hideMainWindow()
            },
          },
          { item: 'Separator' },
          {
            id: 'tray-converter',
            text: t('tray.converter'),
            action: () => {
              void openView('home')
            },
          },
          {
            id: 'tray-recorder',
            text: t('tray.recorder'),
            action: () => {
              void openView('recorder')
            },
          },
          {
            id: 'tray-toggle-recording',
            text: recordingActive ? t('tray.stopRecording') : t('tray.startRecording'),
            action: () => {
              void toggleScreenRecording()
            },
          },
          { item: 'Separator' },
          {
            id: 'tray-settings',
            text: t('tray.settings'),
            action: () => {
              void openView('settings')
            },
          },
          { item: 'Separator' },
          {
            id: 'tray-quit',
            text: t('tray.quit'),
            action: () => {
              void exit(0)
            },
          },
        ],
      })

      if (cancelled) return

      const icon = recordingActive
        ? await createRecordingTrayIcon()
        : await createIdleTrayIcon()
      const tooltip = recordingActive ? t('tray.tooltipRecording') : t('tray.tooltip')
      const existing = await TrayIcon.getById(TRAY_ID)

      if (existing) {
        await existing.setMenu(menu)
        await existing.setTooltip(tooltip)
        await existing.setIconWithAsTemplate(icon, !recordingActive)
        return
      }

      await TrayIcon.new({
        id: TRAY_ID,
        icon,
        iconAsTemplate: !recordingActive,
        menu,
        tooltip,
        showMenuOnLeftClick: true,
      })
    }

    void setup().catch((error) => {
      console.error('Failed to setup tray menu', error)
    })

    return () => {
      cancelled = true
    }
  }, [enabled, i18n.language, language, recorderStatus, setView, t])
}
