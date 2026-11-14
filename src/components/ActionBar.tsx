import { Check, FolderOpen, Play, Square } from '@gravity-ui/icons'
import { Alert, Button, Label, ProgressBar, Spinner, Surface, Typography } from '@heroui/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useConverterStore } from '../store/converter'

export function ActionBar() {
  const { t } = useTranslation()
  const status = useConverterStore((s) => s.status)
  const progress = useConverterStore((s) => s.progress)
  const error = useConverterStore((s) => s.error)
  const ffmpegError = useConverterStore((s) => s.ffmpegError)
  const video = useConverterStore((s) => s.video)
  const startConversion = useConverterStore((s) => s.startConversion)
  const stopConversion = useConverterStore((s) => s.stopConversion)
  const revealOutput = useConverterStore((s) => s.revealOutput)
  const reset = useConverterStore((s) => s.reset)

  const canConvert = Boolean(video) && !ffmpegError && status !== 'converting' && status !== 'probing'

  return (
    <motion.div
      className="app-no-drag space-y-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
    >
      {ffmpegError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('actions.ffmpegRequired')}</Alert.Title>
            <Alert.Description>{ffmpegError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('actions.conversionFailed')}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {status === 'converting' ? (
        <Surface className="space-y-3 rounded-[24px] border border-border p-5" variant="default">
          <ProgressBar
            aria-label={t('actions.converting')}
            className="w-full"
            color="accent"
            value={progress.percent}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <Label>{t('actions.converting')}</Label>
              <ProgressBar.Output />
            </div>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <Typography color="muted" type="body-xs">
            {progress.speed
              ? t('actions.speed', { speed: progress.speed })
              : t('actions.preparing')}
          </Typography>
          <Button fullWidth variant="danger-soft" onPress={() => void stopConversion()}>
            <Square />
            {t('actions.cancel')}
          </Button>
        </Surface>
      ) : null}

      {status === 'done' ? (
        <Surface
          className="flex flex-col gap-3 rounded-[24px] border border-success/30 bg-success-soft/20 p-5"
          variant="secondary"
        >
          <div className="flex items-center gap-2 text-success">
            <Check width={18} height={18} />
            <Typography className="font-semibold" type="body">
              {t('actions.done')}
            </Typography>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onPress={() => void revealOutput()}>
              <FolderOpen />
              {t('actions.reveal')}
            </Button>
            <Button variant="secondary" onPress={() => reset()}>
              {t('actions.newConversion')}
            </Button>
          </div>
        </Surface>
      ) : null}

      {status !== 'converting' && status !== 'done' ? (
        <Button
          fullWidth
          isDisabled={!canConvert}
          isPending={status === 'probing'}
          size="lg"
          onPress={() => void startConversion()}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color="current" size="sm" /> : <Play />}
              {t('actions.convert')}
            </>
          )}
        </Button>
      ) : null}
    </motion.div>
  )
}
