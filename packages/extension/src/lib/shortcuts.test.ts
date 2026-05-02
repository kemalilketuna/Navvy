import { describe, expect, it } from 'vitest'

import { DEFAULT_SHORTCUTS, formatKeyCode, normalizeShortcutsConfig } from './shortcuts'

describe('normalizeShortcutsConfig', () => {
	it('returns defaults for missing/invalid input', () => {
		expect(normalizeShortcutsConfig(undefined)).toEqual(DEFAULT_SHORTCUTS)
		expect(normalizeShortcutsConfig(null)).toEqual(DEFAULT_SHORTCUTS)
		expect(normalizeShortcutsConfig('nope')).toEqual(DEFAULT_SHORTCUTS)
	})

	it('keeps provided codes and fills the rest from defaults', () => {
		const result = normalizeShortcutsConfig({ pttKeyCode: 'KeyV' })
		expect(result.pttKeyCode).toBe('KeyV')
		expect(result.cancelKeyCode).toBe(DEFAULT_SHORTCUTS.cancelKeyCode)
	})

	it('ignores empty or non-string codes', () => {
		const result = normalizeShortcutsConfig({ pttKeyCode: '', cancelKeyCode: 42 })
		expect(result).toEqual(DEFAULT_SHORTCUTS)
	})
})

describe('formatKeyCode', () => {
	it('maps known codes to friendly labels', () => {
		expect(formatKeyCode('Backquote')).toBe('`')
		expect(formatKeyCode('Escape')).toBe('Esc')
		expect(formatKeyCode('ControlLeft')).toBe('Left Ctrl')
	})

	it('derives labels for letters and digits', () => {
		expect(formatKeyCode('KeyA')).toBe('A')
		expect(formatKeyCode('Digit5')).toBe('5')
	})

	it('falls back to the raw code when unknown', () => {
		expect(formatKeyCode('F7')).toBe('F7')
		expect(formatKeyCode('SomethingElse')).toBe('SomethingElse')
	})
})
