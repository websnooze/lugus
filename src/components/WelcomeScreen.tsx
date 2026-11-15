import { Filmstrip, Gear, Video } from '@gravity-ui/icons'
import { Button, Typography } from '@heroui/react'
import { useTranslation } from 'react-i18next'

import { usePreferencesStore } from '../store/preferences'

export function WelcomeScreen() {
  const { t } = useTranslation()
  const setView = usePreferencesStore((s) => s.setView)

  return (
    <div className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-8 pb-16 pt-6">
      <div className="mb-10 max-w-xl text-center">
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-accent">
          {t('welcome.eyebrow')}
        </p>
        <Typography
          className="text-center text-[2.6rem] font-semibold leading-[1.05] tracking-tight"
          type="h1"
        >
          {t('welcome.title')}
        </Typography>
        <Typography className="mt-3 text-center text-balance" color="muted" type="body">
          {t('welcome.subtitle')}
        </Typography>
      </div>

      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        <button
          type="button"
          className="app-no-drag group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-border/80 bg-surface/55 p-7 text-left shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:border-accent/50 hover:bg-surface/80"
          onClick={() => setView('home')}
        >
          <div className="relative space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Filmstrip className="size-6" />
            </div>
            <div className="space-y-2">
              <Typography className="font-semibold tracking-tight" type="h3">
                {t('welcome.converter')}
              </Typography>
              <Typography color="muted" type="body-sm">
                {t('welcome.converterDesc')}
              </Typography>
            </div>
            <span className="inline-flex text-sm font-medium text-accent opacity-80 group-hover:opacity-100">
              {t('welcome.open')} →
            </span>
          </div>
        </button>

        <button
          type="button"
          className="app-no-drag group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-border/80 bg-surface/55 p-7 text-left shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:border-danger/50 hover:bg-surface/80"
          onClick={() => setView('recorder')}
        >
          <div className="relative space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <Video className="size-6" />
            </div>
            <div className="space-y-2">
              <Typography className="font-semibold tracking-tight" type="h3">
                {t('welcome.recorder')}
              </Typography>
              <Typography color="muted" type="body-sm">
                {t('welcome.recorderDesc')}
              </Typography>
            </div>
            <span className="inline-flex text-sm font-medium text-danger opacity-80 group-hover:opacity-100">
              {t('welcome.open')} →
            </span>
          </div>
        </button>
      </div>

      <div className="app-no-drag mt-8">
        <Button variant="ghost" onPress={() => setView('settings')}>
          <Gear />
          {t('nav.settings')}
        </Button>
      </div>
    </div>
  )
}
