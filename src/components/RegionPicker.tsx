import { Button, Typography } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { closeRegionPicker, confirmRegion, listDisplays } from '../lib/api'

interface DraftRect {
  x: number
  y: number
  width: number
  height: number
}

function readQueryNumber(key: string): number | null {
  try {
    const value = new URLSearchParams(window.location.search).get(key)
    if (!value) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function RegionPicker() {
  const { t } = useTranslation()
  const [drawing, setDrawing] = useState(false)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<DraftRect | null>(null)
  const [displayId, setDisplayId] = useState<number | null>(readQueryNumber('displayId'))
  const [scale, setScale] = useState(
    readQueryNumber('scale') || window.devicePixelRatio || 2,
  )
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const displayIdRef = useRef(displayId)
  const scaleRef = useRef(scale)

  useEffect(() => {
    displayIdRef.current = displayId
  }, [displayId])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    document.documentElement.classList.add('region-picker')

    const queryDisplayId = readQueryNumber('displayId')
    const queryScale = readQueryNumber('scale')

    void listDisplays().then((displays) => {
      const selected =
        (queryDisplayId != null
          ? displays.find((d) => d.id === queryDisplayId)
          : null) ??
        displays.find((d) => d.isMain) ??
        displays[0]
      if (!selected) return
      setDisplayId(selected.id)
      setScale(queryScale || selected.scale || window.devicePixelRatio || 2)
    })

    return () => {
      document.documentElement.classList.remove('region-picker')
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void closeRegionPicker()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submitRect = async (next: DraftRect) => {
    const id = displayIdRef.current
    if (!id || submitting || next.width < 8 || next.height < 8) return

    setSubmitting(true)
    try {
      await confirmRegion(
        {
          x: Math.round(next.x),
          y: Math.round(next.y),
          width: Math.round(next.width),
          height: Math.round(next.height),
        },
        id,
        scaleRef.current,
      )
    } catch (error) {
      console.error('Failed to confirm region', error)
      setSubmitting(false)
    }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (submitting) return
    const x = event.clientX
    const y = event.clientY
    setDrawing(true)
    setOrigin({ x, y })
    setRect({ x, y, width: 0, height: 0 })
    overlayRef.current?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drawing || !origin || submitting) return
    const x = Math.min(origin.x, event.clientX)
    const y = Math.min(origin.y, event.clientY)
    const width = Math.abs(event.clientX - origin.x)
    const height = Math.abs(event.clientY - origin.y)
    setRect({ x, y, width, height })
  }

  const onPointerUp = (event: React.PointerEvent) => {
    if (!drawing || !origin || submitting) {
      setDrawing(false)
      return
    }

    setDrawing(false)
    try {
      overlayRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }

    const next = {
      x: Math.min(origin.x, event.clientX),
      y: Math.min(origin.y, event.clientY),
      width: Math.abs(event.clientX - origin.x),
      height: Math.abs(event.clientY - origin.y),
    }
    setRect(next)

    if (next.width >= 8 && next.height >= 8) {
      void submitRect(next)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 cursor-crosshair select-none bg-black/35"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-2xl bg-black/70 px-4 py-2 text-center text-white backdrop-blur">
        <Typography className="text-white" type="body-sm">
          {submitting ? t('recorder.regionSaving') : t('recorder.regionHint')}
        </Typography>
      </div>

      {rect ? (
        <div
          className="pointer-events-none absolute border-2 border-accent bg-accent/10"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }}
        />
      ) : null}

      <div
        className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Button
          isDisabled={submitting}
          variant="secondary"
          onPress={() => {
            void closeRegionPicker()
          }}
        >
          {t('recorder.cancel')}
        </Button>
      </div>
    </div>
  )
}
