/**
 * Content-script keyboard bridge for the in-page shortcuts.
 *
 * The side panel only receives key events when focused, but the user is usually
 * looking at the page. This listens on the page and relays both shortcuts to the
 * side panel over the runtime message bus:
 *
 * - Hold ` (Backquote) to talk → VOICE_PTT_DOWN / VOICE_PTT_UP (voice only).
 * - Press Esc → CANCEL_ACTION (the panel acts only while a task is running).
 *
 * Guards: push-to-talk ignores auto-repeat and key presses while an editable
 * element is focused; cancel is always relayed and the panel decides.
 */
import { normalizeVoiceConfig } from '@/voice/types'

import { DEFAULT_SHORTCUTS, normalizeShortcutsConfig } from './shortcuts'

function isEditableTarget(node: Element | null): boolean {
	if (!node) return false
	const el = node as HTMLElement
	const tag = el.tagName
	return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function initContentShortcuts(): void {
	let voiceEnabled = false
	let pttCode = DEFAULT_SHORTCUTS.pttKeyCode
	let cancelCode = DEFAULT_SHORTCUTS.cancelKeyCode
	let pttPressed = false

	chrome.storage.local.get(['voiceConfig', 'shortcutsConfig']).then((r) => {
		voiceEnabled = normalizeVoiceConfig(r.voiceConfig).enabled
		const s = normalizeShortcutsConfig(r.shortcutsConfig)
		pttCode = s.pttKeyCode
		cancelCode = s.cancelKeyCode
	})
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local') return
		if (changes.voiceConfig) {
			voiceEnabled = normalizeVoiceConfig(changes.voiceConfig.newValue).enabled
			if (!voiceEnabled) pttPressed = false
		}
		if (changes.shortcutsConfig) {
			const s = normalizeShortcutsConfig(changes.shortcutsConfig.newValue)
			pttCode = s.pttKeyCode
			cancelCode = s.cancelKeyCode
		}
	})

	window.addEventListener(
		'keydown',
		(e) => {
			if (
				voiceEnabled &&
				e.code === pttCode &&
				!e.repeat &&
				!pttPressed &&
				!isEditableTarget(document.activeElement)
			) {
				pttPressed = true
				chrome.runtime.sendMessage({ type: 'VOICE_PTT_DOWN' }).catch(() => {})
				return
			}
			if (e.code === cancelCode) {
				chrome.runtime.sendMessage({ type: 'CANCEL_ACTION' }).catch(() => {})
			}
		},
		true
	)

	window.addEventListener(
		'keyup',
		(e) => {
			if (e.code === pttCode && pttPressed) {
				pttPressed = false
				chrome.runtime.sendMessage({ type: 'VOICE_PTT_UP' }).catch(() => {})
			}
		},
		true
	)
}
