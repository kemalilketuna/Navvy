/**
 * Keyboard shortcuts handled in-app via JS listeners (side panel + content
 * script) rather than Chrome `commands`, so they can be single keys and stay
 * user-configurable.
 *
 * Chrome's command system requires a Ctrl/Alt/Cmd modifier and rejects bare
 * keys like Escape, so single-key shortcuts must be wired by hand.
 *
 * Keys are matched on KeyboardEvent.code (physical key, layout-independent).
 */

export interface ShortcutsConfig {
	/** Physical key (KeyboardEvent.code) held to talk. */
	pttKeyCode: string
	/** Physical key (KeyboardEvent.code) that cancels a running task. */
	cancelKeyCode: string
}

export const DEFAULT_SHORTCUTS: ShortcutsConfig = {
	pttKeyCode: 'Backquote',
	cancelKeyCode: 'Escape',
}

/** Coerce stored/unknown data into a complete ShortcutsConfig, filling defaults. */
export function normalizeShortcutsConfig(raw: unknown): ShortcutsConfig {
	if (!raw || typeof raw !== 'object') return { ...DEFAULT_SHORTCUTS }
	const r = raw as Partial<ShortcutsConfig>
	return {
		pttKeyCode:
			typeof r.pttKeyCode === 'string' && r.pttKeyCode
				? r.pttKeyCode
				: DEFAULT_SHORTCUTS.pttKeyCode,
		cancelKeyCode:
			typeof r.cancelKeyCode === 'string' && r.cancelKeyCode
				? r.cancelKeyCode
				: DEFAULT_SHORTCUTS.cancelKeyCode,
	}
}

const KEY_LABELS: Record<string, string> = {
	Backquote: '`',
	Escape: 'Esc',
	Space: 'Space',
	Tab: 'Tab',
	Enter: 'Enter',
	Minus: '-',
	Equal: '=',
	BracketLeft: '[',
	BracketRight: ']',
	Backslash: '\\',
	Semicolon: ';',
	Quote: "'",
	Comma: ',',
	Period: '.',
	Slash: '/',
	ControlLeft: 'Left Ctrl',
	ControlRight: 'Right Ctrl',
	AltLeft: 'Alt',
	AltRight: 'Right Alt',
	ShiftLeft: 'Left Shift',
	ShiftRight: 'Right Shift',
	MetaLeft: 'Cmd/Win',
	MetaRight: 'Cmd/Win',
	ArrowUp: '↑',
	ArrowDown: '↓',
	ArrowLeft: '←',
	ArrowRight: '→',
}

/** Human-friendly label for a KeyboardEvent.code. */
export function formatKeyCode(code: string): string {
	if (KEY_LABELS[code]) return KEY_LABELS[code]
	const letter = /^Key([A-Z])$/.exec(code)
	if (letter) return letter[1]
	const digit = /^Digit(\d)$/.exec(code)
	if (digit) return digit[1]
	const fkey = /^F(\d{1,2})$/.exec(code)
	if (fkey) return code
	const numpad = /^Numpad(.+)$/.exec(code)
	if (numpad) return `Num ${numpad[1]}`
	return code
}
