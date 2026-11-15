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
        'app-no-drag rounded-[22px] border border-white/12 bg-[rgba(18,22,28,0.72)] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
