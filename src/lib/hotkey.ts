export const DEFAULT_RECORDING_HOTKEY = 'Command+Shift+8'

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight'])

/** Convertit un KeyboardEvent en raccourci Tauri (ex: Command+Shift+8). */
export function eventToShortcut(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null

  const parts: string[] = []
  if (event.metaKey) parts.push('Command')
  if (event.ctrlKey) parts.push('Control')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const key = normalizeKey(event)
  if (!key) return null
  if (parts.length === 0) return null

  parts.push(key)
  return parts.join('+')
}

function normalizeKey(event: KeyboardEvent): string | null {
  const { code } = event

  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3)
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return code.slice(5)
  }
  if (code.startsWith('Numpad') && code.length > 6) {
    const rest = code.slice(6)
    if (/^\d$/.test(rest)) return `Num${rest}`
  }

  const special: Record<string, string> = {
    Space: 'Space',
    Enter: 'Enter',
    Tab: 'Tab',
    Escape: 'Escape',
    Backspace: 'Backspace',
    Delete: 'Delete',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Minus: 'Minus',
    Equal: 'Equal',
    BracketLeft: 'LeftBracket',
    BracketRight: 'RightBracket',
    Semicolon: 'Semicolon',
    Quote: 'Quote',
    Backquote: 'Backquote',
    Backslash: 'Backslash',
    Comma: 'Comma',
    Period: 'Period',
    Slash: 'Slash',
  }

  if (special[code]) return special[code]

  if (/^F([1-9]|1[0-2])$/.test(code)) return code

  if (event.key.length === 1) {
    return event.key.toUpperCase()
  }

  return null
}

/** Affichage lisible macOS : ⌘⇧8 */
export function formatShortcutLabel(shortcut: string): string {
  return shortcut
    .split('+')
    .map((part) => {
      switch (part) {
        case 'Command':
        case 'Cmd':
        case 'Super':
        case 'CommandOrControl':
        case 'CmdOrControl':
          return '⌘'
        case 'Shift':
          return '⇧'
        case 'Alt':
        case 'Option':
          return '⌥'
        case 'Control':
        case 'Ctrl':
          return '⌃'
        case 'Space':
          return 'Space'
        default:
          return part
      }
    })
    .join(' ')
}
