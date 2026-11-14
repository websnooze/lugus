import { FolderArrowDown } from '@gravity-ui/icons'
import {
  Button,
  Description,
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

import { useConverterStore } from '../store/converter'
import { usePresetsStore } from '../store/presets'
import { FORMAT_OPTIONS, type OutputFormat, type QualityPreset } from '../types'
import { PresetsPanel } from './PresetsPanel'

export function OptionsPanel() {
  const { t } = useTranslation()
  const format = useConverterStore((s) => s.format)
  const quality = useConverterStore((s) => s.quality)
  const outputPath = useConverterStore((s) => s.outputPath)
  const status = useConverterStore((s) => s.status)
  const setFormat = useConverterStore((s) => s.setFormat)
  const setQuality = useConverterStore((s) => s.setQuality)
  const chooseOutput = useConverterStore((s) => s.chooseOutput)
  const video = useConverterStore((s) => s.video)
  const setActivePresetId = usePresetsStore((s) => s.setActivePresetId)
  const disabled = status === 'converting' || status === 'probing' || !video

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Surface
        className="app-no-drag space-y-6 rounded-[28px] border border-border bg-surface/70 p-6"
        variant="default"
      >
        <div>
          <Typography className="font-semibold" type="h4">
            {t('options.title')}
          </Typography>
          <Typography color="muted" type="body-sm">
            {t('options.subtitle')}
          </Typography>
        </div>

        <Select
          className="w-full"
          isDisabled={disabled}
          placeholder={t('options.format')}
          value={format}
          onChange={(key) => {
            if (!key) return
            setActivePresetId(null)
            void setFormat(String(key) as OutputFormat)
          }}
        >
          <Label>{t('options.format')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {FORMAT_OPTIONS.map((option) => (
                <ListBox.Item id={option.id} key={option.id} textValue={option.id.toUpperCase()}>
                  <div className="flex flex-col">
                    <span>{option.id.toUpperCase()}</span>
                    <span className="text-xs text-muted">{t(`formats.${option.id}`)}</span>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <RadioGroup
          isDisabled={disabled}
          name="quality"
          orientation="horizontal"
          value={quality}
          variant="secondary"
          onChange={(value) => {
            setActivePresetId(null)
            setQuality(value as QualityPreset)
          }}
        >
          <Label>{t('options.quality')}</Label>
          <Description>{t('options.qualityHint')}</Description>
          {(['high', 'balanced', 'small'] as const).map((id) => (
            <Radio key={id} value={id}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`qualities.${id}`)}
              </Radio.Content>
              <Description>{t(`qualities.${id}Hint`)}</Description>
            </Radio>
          ))}
        </RadioGroup>

        <div className="space-y-2">
          <Typography type="body-sm" weight="medium">
            {t('options.outputFile')}
          </Typography>
          <div className="flex items-center gap-2">
            <Surface
              className="min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-sm text-muted"
              variant="secondary"
            >
              {outputPath ?? t('options.noOutput')}
            </Surface>
            <Button
              isDisabled={disabled}
              isIconOnly
              aria-label={t('options.chooseOutput')}
              variant="secondary"
              onPress={() => void chooseOutput()}
            >
              <FolderArrowDown />
            </Button>
          </div>
        </div>

        <PresetsPanel />
      </Surface>
    </motion.div>
  )
}
