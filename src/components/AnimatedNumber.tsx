import NumberFlow, { type Format } from '@number-flow/react'

type AnimatedNumberProps = {
  value: number
  className?: string
  format?: Format
  suffix?: string
  prefix?: string
}

/** NumberFlow wrapper pour les compteurs animés de l’UI. */
export function AnimatedNumber({
  value,
  className,
  format,
  suffix,
  prefix,
}: AnimatedNumberProps) {
  return (
    <NumberFlow
      className={className}
      value={value}
      format={format}
      prefix={prefix}
      suffix={suffix}
    />
  )
}

type AnimatedTimeProps = {
  seconds: number
  className?: string
}

/** Timecode mm:ss animé. */
export function AnimatedTime({ seconds, className }: AnimatedTimeProps) {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return (
    <span className={className}>
      <NumberFlow value={m} format={{ minimumIntegerDigits: 2 }} />
      <span>:</span>
      <NumberFlow value={s} format={{ minimumIntegerDigits: 2 }} />
    </span>
  )
}
