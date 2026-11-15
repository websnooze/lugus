import { Button, Typography } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CaptureRegion } from '../lib/api'
import { DimHole } from './DimHole'

interface DraftRect {
  x: number
  y: number
  width: number
  height: number
}

type RegionDrawLayerProps = {
  onConfirm: (css: CaptureRegion) => void
  onCancel: () => void
}

/** Calque plein écran pour dessiner une zone (dans la fenêtre overlay). */
export function RegionDrawLayer({ onConfirm, onCancel }: RegionDrawLayerProps) {
  const { t } = useTranslation()
  const [drawing, setDrawing] = useState(false)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<DraftRect | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const onPointerDown = (event: React.PointerEvent) => {
    const x = event.clientX
    const y = event.clientY
    setDrawing(true)
    setOrigin({ x, y })
    setRect({ x, y, width: 0, height: 0 })
    overlayRef.current?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drawing || !origin) return
    setRect({
      x: Math.min(origin.x, event.clientX),
      y: Math.min(origin.y, event.clientY),
      width: Math.abs(event.clientX - origin.x),
      height: Math.abs(event.clientY - origin.y),
    })
  }

  const onPointerUp = (event: React.PointerEvent) => {
    if (!drawing || !origin) {
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
      onConfirm({
        x: Math.round(next.x),
        y: Math.round(next.y),
        width: Math.round(next.width),
        height: Math.round(next.height),
      })
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 cursor-crosshair select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Voile plein écran tant qu’aucune zone n’est tirée */}
      {!rect ? <div className="absolute inset-0 bg-black/35" /> : null}

      {rect ? <DimHole rect={rect} dimOpacity={0.45} /> : null}

      <div className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-2xl bg-black/70 px-4 py-2 text-center text-white">
        <Typography className="text-white" type="body-sm">
          {t('recorder.regionHint')}
        </Typography>
      </div>

      <div
        className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Button variant="secondary" onPress={onCancel}>
          {t('recorder.cancel')}
        </Button>
      </div>
    </div>
  )
}
