import { ArrowLeft, Globe, Moon, Sun } from '@gravity-ui/icons'
import {
  Button,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  Surface,
  Typography,
} from '@heroui/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n'
import { usePreferencesStore, type ThemeMode } from '../store/preferences'

export function SettingsScreen() {
  const { t } = useTranslation()
  const language = usePreferencesStore((s) => s.language)
  const themeMode = usePreferencesStore((s) => s.themeMode)
  const setLanguage = usePreferencesStore((s) => s.setLanguage)
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode)
  const setView = usePreferencesStore((s) => s.setView)

  return (
    <motion.div
      className="space-y-5 px-6 py-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Button className="app-no-drag" variant="ghost" onPress={() => setView('home')}>
        <ArrowLeft />
        {t('settings.back')}
      </Button>

      <Surface className="app-no-drag space-y-6 rounded-[28px] border border-border bg-surface/70 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            {themeMode === 'light' ? <Sun /> : <Moon />}
          </div>
          <div>
            <Typography className="font-semibold" type="h4">
              {t('settings.appearance')}
            </Typography>
            <Typography color="muted" type="body-sm">
              {t('settings.appearanceDesc')}
            </Typography>
          </div>
        </div>

        <RadioGroup
          name="theme"
          orientation="horizontal"
          value={themeMode}
          variant="secondary"
          onChange={(value) => setThemeMode(value as ThemeMode)}
        >
          <Label>{t('settings.theme')}</Label>
          <Radio value="light">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t('settings.themeLight')}
            </Radio.Content>
          </Radio>
          <Radio value="dark">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t('settings.themeDark')}
            </Radio.Content>
          </Radio>
          <Radio value="system">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t('settings.themeSystem')}
            </Radio.Content>
          </Radio>
        </RadioGroup>
      </Surface>

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
    </motion.div>
  )
}
