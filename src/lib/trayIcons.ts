import { Image } from '@tauri-apps/api/image'

function circleIcon(
  size: number,
  fill: [number, number, number],
  inner?: { kind: 'dot' | 'square'; color: [number, number, number]; radius: number },
): Uint8Array {
  const rgba = new Uint8Array(size * size * 4)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const outer = size * 0.42

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.hypot(dx, dy)

      let alpha = 0
      if (dist <= outer - 0.5) alpha = 255
      else if (dist < outer + 0.5) alpha = Math.round(255 * (outer + 0.5 - dist))

      let r = fill[0]
      let g = fill[1]
      let b = fill[2]

      if (inner && alpha > 0) {
        if (inner.kind === 'dot') {
          if (dist <= inner.radius) {
            r = inner.color[0]
            g = inner.color[1]
            b = inner.color[2]
          }
        } else {
          const half = inner.radius
          if (Math.abs(dx) <= half && Math.abs(dy) <= half) {
            r = inner.color[0]
            g = inner.color[1]
            b = inner.color[2]
          }
        }
      }

      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = alpha
    }
  }

  return rgba
}

/** Icône tray idle (template macOS, monochrome). */
export async function createIdleTrayIcon(): Promise<Image> {
  const size = 32
  const rgba = circleIcon(size, [255, 255, 255], {
    kind: 'dot',
    color: [0, 0, 0],
    radius: size * 0.14,
  })
  return Image.new(rgba, size, size)
}

/** Icône tray recording (rouge, non-template). */
export async function createRecordingTrayIcon(): Promise<Image> {
  const size = 32
  const rgba = circleIcon(size, [230, 50, 62], {
    kind: 'square',
    color: [255, 255, 255],
    radius: size * 0.14,
  })
  return Image.new(rgba, size, size)
}
