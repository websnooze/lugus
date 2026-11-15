import { ArrowLeft, Globe, Keyboard, Power } from '@gravity-ui/icons'
import {
  Alert,
  Button,
  Description,
  Label,
  ListBox,
  Select,
  Surface,
  Switch,
  Typography,
} from '@heroui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n'
import { applyLaunchAtLogin } from '../hooks/useAutostart'
import { usePreferencesStore } from '../store/preferences'
import { HotkeyRecorder } from './HotkeyRecorder'

export function SettingsScreen() {
  const { t } = useTranslation()
  const language = usePreferencesStore((s) => s.language)
  const launchAtLogin = usePreferencesStore((s) => s.launchAtLogin)
  const recordingHotkey = usePreferencesStore((s) => s.recordingHotkey)
  const setLanguage = usePreferencesStore((s) => s.setLanguage)
  const setLaunchAtLogin = usePreferencesStore((s) => s.setLaunchAtLogin)
  const setRecordingHotkey = usePreferencesStore((s) => s.setRecordingHotkey)
  const setView = usePreferencesStore((s) => s.setView)
  const [autostartBusy, setAutostartBusy] = useState(false)
  const [autostartError, setAutostartError] = useState<string | null>(null)

  const handleLaunchAtLogin = async (next: boolean) => {
    setAutostartBusy(true)
    setAutostartError(null)
    const previous = launchAtLogin
    setLaunchAtLogin(next)
    try {
      await applyLaunchAtLogin(next)
    } catch (error) {
      setLaunchAtLogin(previous)
      setAutostartError(
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      setAutostartBusy(false)
    }
  }

  return (
    <div className="space-y-5 px-6 py-6">
      <Button className="app-no-drag" variant="ghost" onPress={() => setView('welcome')}>
        <ArrowLeft />
        {t('settings.back')}
      </Button>

      <Surface className="app-no-drag space-y-6 rounded-[28px] border border-border bg-surface/70 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Globe />
          </div>
          <div>
            <Typography className="font-semibold" type="h4">
              {t('settings.language')}
            </Typography>
            <Typography color="muted" type="body-sm">
              {t('settings.languageDesc')}
            </Typography>
          </div>
        </div>

        <Select
          className="w-full"
          value={language}
          onChange={(key) => {
            if (key) setLanguage(String(key) as AppLanguage)
          }}
        >
          <Label>{t('settings.language')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <ListBox.Item id={lang.code} key={lang.code} textValue={lang.native}>
                  <div className="flex flex-col">
                    <span>{lang.native}</span>
                    <span className="text-xs text-muted">{lang.label}</span>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Surface>

      <Surface className="app-no-drag space-y-6 rounded-[28px] border border-border bg-surface/70 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Power />
          </div>
          <div>
            <Typography className="font-semibold" type="h4">
              {t('settings.general')}
            </Typography>
            <Typography color="muted" type="body-sm">
              {t('settings.generalDesc')}
            </Typography>
          </div>
        </div>

        <Switch
          isDisabled={autostartBusy}
          isSelected={launchAtLogin}
          onChange={(value) => {
            void handleLaunchAtLogin(value)
          }}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {t('settings.launchAtLogin')}
          </Switch.Content>
          <Description>{t('settings.launchAtLoginDesc')}</Description>
        </Switch>

        {autostartError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t('settings.launchAtLoginError')}</Alert.Title>
              <Alert.Description>{autostartError}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Surface>

      <Surface className="app-no-drag space-y-6 rounded-[28px] border border-border bg-surface/70 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Keyboard />
          </div>
          <div>
            <Typography className="font-semibold" type="h4">
              {t('settings.shortcuts')}
            </Typography>
            <Typography color="muted" type="body-sm">
              {t('settings.shortcutsDesc')}
            </Typography>
          </div>
        </div>

        <HotkeyRecorder value={recordingHotkey} onChange={setRecordingHotkey} />
      </Surface>
    </div>
  )
}
