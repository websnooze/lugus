type Rect = { x: number; y: number; width: number; height: number }

type DimHoleProps = {
  rect: Rect
  /** Opacité du voile autour (0–1). */
  dimOpacity?: number
  className?: string
  borderClassName?: string
}

/**
 * Voile autour d’un trou rectangulaire via 4 panneaux (pas de box-shadow 9999px).
 * Évite les auréoles noires autour des widgets en backdrop-blur.
 */
export function DimHole({
  rect,
  dimOpacity = 0.35,
  className = '',
  borderClassName = 'border-2 border-accent',
}: DimHoleProps) {
  const dim = `rgba(0,0,0,${dimOpacity})`
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`.trim()}>
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: Math.max(0, rect.y), background: dim }}
      />
      <div
        className="absolute left-0"
        style={{
          top: rect.y,
          width: Math.max(0, rect.x),
          height: Math.max(0, rect.height),
          background: dim,
        }}
      />
      <div
        className="absolute"
        style={{
          top: rect.y,
          left: rect.x + rect.width,
          right: 0,
          height: Math.max(0, rect.height),
          background: dim,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: rect.y + rect.height, background: dim }}
      />
      <div
        className={`absolute ${borderClassName}`}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
      />
    </div>
  )
}
