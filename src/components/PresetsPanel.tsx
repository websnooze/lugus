import { Check, Pencil, Plus, TrashBin } from '@gravity-ui/icons'
import {
  Button,
  Chip,
  Input,
  Label,
  Modal,
  Surface,
  TextField,
  Typography,
  toast,
} from '@heroui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useConverterStore } from '../store/converter'
import { usePresetsStore, type ConversionPreset } from '../store/presets'

export function PresetsPanel() {
  const { t } = useTranslation()
  const presets = usePresetsStore((s) => s.presets)
  const activePresetId = usePresetsStore((s) => s.activePresetId)
  const addPreset = usePresetsStore((s) => s.addPreset)
  const renamePreset = usePresetsStore((s) => s.renamePreset)
  const deletePreset = usePresetsStore((s) => s.deletePreset)
  const setActivePresetId = usePresetsStore((s) => s.setActivePresetId)

  const format = useConverterStore((s) => s.format)
  const quality = useConverterStore((s) => s.quality)
  const setFormat = useConverterStore((s) => s.setFormat)
  const setQuality = useConverterStore((s) => s.setQuality)
  const status = useConverterStore((s) => s.status)
  const disabled = status === 'converting' || status === 'probing'

  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<ConversionPreset | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const saveCurrent = () => {
    const fallback = `${format.toUpperCase()} · ${quality}`
    addPreset({
      name: name.trim() || fallback,
      format,
      quality,
    })
    setName('')
  }

  const applyPreset = async (preset: ConversionPreset) => {
    setActivePresetId(preset.id)
    setQuality(preset.quality)
    await setFormat(preset.format)
    toast.success(t('toasts.presetApplied'))
  }

  return (
    <div className="space-y-4 border-t border-separator pt-5">
      <div>
        <Typography className="font-semibold" type="h4">
          {t('presets.title')}
        </Typography>
        <Typography color="muted" type="body-sm">
          {t('presets.subtitle')}
        </Typography>
      </div>

      <div className="flex gap-2">
        <TextField
          className="min-w-0 flex-1"
          isDisabled={disabled}
          name="preset-name"
          value={name}
          variant="secondary"
          onChange={setName}
        >
          <Label className="sr-only">{t('presets.namePlaceholder')}</Label>
          <Input placeholder={t('presets.namePlaceholder')} />
        </TextField>
        <Button isDisabled={disabled} variant="secondary" onPress={saveCurrent}>
          <Plus />
          {t('presets.save')}
        </Button>
      </div>

      {presets.length === 0 ? (
        <Typography color="muted" type="body-sm">
          {t('presets.empty')}
        </Typography>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <Surface
              key={preset.id}
              className={[
                'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                activePresetId === preset.id
                  ? 'border-accent/40 bg-accent-soft/30'
                  : 'border-border bg-surface-secondary/40',
              ].join(' ')}
              variant="secondary"
            >
              <div className="min-w-0 flex-1">
                <Typography className="truncate font-medium" type="body-sm">
                  {preset.name}
                </Typography>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip size="sm" variant="soft">
                    {preset.format.toUpperCase()}
                  </Chip>
                  <Chip size="sm" variant="soft">
                    {t(`qualities.${preset.quality}`)}
                  </Chip>
                </div>
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  isDisabled={disabled}
                  isIconOnly
                  aria-label={t('presets.apply')}
                  size="sm"
                  variant="secondary"
                  onPress={() => void applyPreset(preset)}
                >
                  <Check />
                </Button>
                <Button
                  isDisabled={disabled}
                  isIconOnly
                  aria-label={t('presets.rename')}
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    setRenaming(preset)
                    setRenameValue(preset.name)
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  isDisabled={disabled}
                  isIconOnly
                  aria-label={t('presets.delete')}
                  size="sm"
                  variant="danger-soft"
                  onPress={() => deletePreset(preset.id)}
                >
                  <TrashBin />
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <Modal.Backdrop
        isOpen={Boolean(renaming)}
        onOpenChange={(open) => {
          if (!open) setRenaming(null)
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('presets.renameTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField
                className="w-full"
                name="rename-preset"
                value={renameValue}
                variant="secondary"
                onChange={setRenameValue}
              >
                <Label>{t('presets.namePlaceholder')}</Label>
                <Input />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={() => setRenaming(null)}>
                {t('presets.cancel')}
              </Button>
              <Button
                onPress={() => {
                  if (!renaming) return
                  renamePreset(renaming.id, renameValue)
                  setRenaming(null)
                }}
              >
                {t('presets.confirm')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
