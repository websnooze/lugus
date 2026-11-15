import type { HTMLAttributes, ReactNode } from 'react'

type FloatingWidgetProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  className?: string
  /** Conservé pour compat — plus d’animation d’entrée. */
  delay?: number
}

/** Panneau verre flottant pour l’overlay recorder. */
export function FloatingWidget({
  children,
  className = '',
  delay: _delay,
  ...rest
}: FloatingWidgetProps) {
  return (
    <div
      className={[
        // Pas de grosse ombre / blur lourd : ça créait des auréoles noires avec le voile de zone.
        'app-no-drag rounded-[22px] border border-white/12 bg-[rgba(18,22,28,0.92)]',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
