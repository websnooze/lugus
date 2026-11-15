import { Button, Description, Kbd, Label, Typography } from '@heroui/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_RECORDING_HOTKEY, eventToShortcut } from '../lib/hotkey'
import { usePreferencesStore } from '../store/preferences'

type HotkeyRecorderProps = {
  value: string
  onChange: (hotkey: string) => void
}

const MODIFIER_ABBR: Record<string, 'command' | 'shift' | 'ctrl' | 'option' | 'alt'> = {
  Command: 'command',
  Cmd: 'command',
  Super: 'command',
  CommandOrControl: 'command',
  CmdOrControl: 'command',
  Shift: 'shift',
  Control: 'ctrl',
  Ctrl: 'ctrl',
  Alt: 'option',
  Option: 'option',
}

function ShortcutPreview({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split('+').filter(Boolean)
  if (parts.length === 0) return null

  const modifiers = parts.slice(0, -1)
  const key = parts[parts.length - 1]

  return (
    <Kbd>
      {modifiers.map((part) => {
        const abbr = MODIFIER_ABBR[part]
        if (abbr) {
          return <Kbd.Abbr key={part} keyValue={abbr} />
        }
        return <Kbd.Content key={part}>{part}</Kbd.Content>
      })}
      <Kbd.Content>{key}</Kbd.Content>
    </Kbd>
  )
}

export function HotkeyRecorder({ value, onChange }: HotkeyRecorderProps) {
  const { t } = useTranslation()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setHotkeyCaptureActive = usePreferencesStore((s) => s.setHotkeyCaptureActive)

  useEffect(() => {
    setHotkeyCaptureActive(listening)
    return () => setHotkeyCaptureActive(false)
  }, [listening, setHotkeyCaptureActive])

  useEffect(() => {
    if (!listening) return

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setListening(false)
        setError(null)
        return
      }

      const shortcut = eventToShortcut(event)
      if (!shortcut) {
        setError(t('settings.hotkeyNeedModifier'))
        return
      }

      onChange(shortcut)
      setListening(false)
      setError(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listening, onChange, t])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Label>{t('settings.hotkey')}</Label>
          <Description>{t('settings.hotkeyDesc')}</Description>
        </div>
        <ShortcutPreview shortcut={value || DEFAULT_RECORDING_HOTKEY} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          className={listening ? 'ring-2 ring-accent' : undefined}
          variant={listening ? 'primary' : 'secondary'}
          onPress={() => {
            setError(null)
            setListening((prev) => !prev)
          }}
        >
          {listening ? t('settings.hotkeyListening') : t('settings.hotkeyRecord')}
        </Button>
        <Button
          isDisabled={value === DEFAULT_RECORDING_HOTKEY}
          variant="ghost"
          onPress={() => {
            onChange(DEFAULT_RECORDING_HOTKEY)
            setListening(false)
            setError(null)
          }}
        >
          {t('settings.hotkeyReset')}
        </Button>
      </div>

      {listening ? (
        <Typography color="muted" type="body-sm">
          {t('settings.hotkeyHint')}
        </Typography>
      ) : null}

      {error ? (
        <Typography className="text-danger" type="body-sm">
          {error}
        </Typography>
      ) : null}
    </div>
  )
}
