import { ArrowLeft, Filmstrip, Gear, Video } from '@gravity-ui/icons'
import { Button, Typography } from '@heroui/react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useTranslation } from 'react-i18next'

import { startWindowDrag } from '../lib/windowDrag'
import { usePreferencesStore } from '../store/preferences'
import { WindowControls } from './WindowControls'

export function Navbar() {
  const { t } = useTranslation()
  const view = usePreferencesStore((s) => s.view)
  const setView = usePreferencesStore((s) => s.setView)

  if (view === 'recorder') return null

  const title =
    view === 'settings'
      ? t('settings.title')
      : view === 'home'
        ? t('nav.home')
        : t('app.title')

  const onTitlebarDoubleClick = () => {
    void getCurrentWindow().toggleMaximize()
  }

  return (
    <header
      className="app-titlebar sticky top-0 z-20 flex cursor-default items-center justify-between px-4 pb-3 pt-3.5"
      data-tauri-drag-region
      onDoubleClick={onTitlebarDoubleClick}
      onPointerDown={startWindowDrag}
    >
      <div className="flex min-w-0 items-center gap-3.5" data-tauri-drag-region>
        <div data-no-window-drag>
          <WindowControls />
        </div>

        {view !== 'welcome' ? (
          <div data-no-window-drag>
            <Button
              isIconOnly
              aria-label={t('nav.modes')}
              size="sm"
              variant="ghost"
              onPress={() => setView('welcome')}
            >
              <ArrowLeft />
            </Button>
          </div>
        ) : null}

        <span data-tauri-drag-region className="min-w-0 truncate">
          <Typography
            className="truncate text-[1.15rem] font-semibold leading-none tracking-tight"
            type="h3"
          >
            {title}
          </Typography>
        </span>
      </div>

      <div className="flex items-center gap-1.5" data-no-window-drag>
        {view !== 'welcome' ? (
          <>
            <Button
              isIconOnly
              aria-label={t('nav.home')}
              size="sm"
              variant={view === 'home' ? 'secondary' : 'ghost'}
              onPress={() => setView('home')}
            >
              <Filmstrip />
            </Button>
            <Button
              isIconOnly
              aria-label={t('nav.recorder')}
              size="sm"
              variant="ghost"
              onPress={() => setView('recorder')}
            >
              <Video />
            </Button>
          </>
        ) : null}
        <Button
          isIconOnly
          aria-label={t('nav.settings')}
          size="sm"
          variant={view === 'settings' ? 'secondary' : 'ghost'}
          onPress={() => setView('settings')}
        >
          <Gear />
        </Button>
      </div>
    </header>
  )
}
