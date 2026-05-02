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

import { CANCEL_KEY, PTT_KEY_CODE } from './shortcuts'

function isEditableTarget(node: Element | null): boolean {
	if (!node) return false
	const el = node as HTMLElement
	const tag = el.tagName
	return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function initContentShortcuts(): void {
	let voiceEnabled = false
	let pttPressed = false

	const apply = (raw: unknown) => {
		voiceEnabled = normalizeVoiceConfig(raw).enabled
		if (!voiceEnabled) pttPressed = false
	}

	chrome.storage.local.get('voiceConfig').then((r) => apply(r.voiceConfig))
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && changes.voiceConfig) apply(changes.voiceConfig.newValue)
	})

	window.addEventListener(
		'keydown',
		(e) => {
			if (
				voiceEnabled &&
				e.code === PTT_KEY_CODE &&
				!e.repeat &&
				!pttPressed &&
				!isEditableTarget(document.activeElement)
			) {
				pttPressed = true
				chrome.runtime.sendMessage({ type: 'VOICE_PTT_DOWN' }).catch(() => {})
				return
			}
			if (e.key === CANCEL_KEY) {
				chrome.runtime.sendMessage({ type: 'CANCEL_ACTION' }).catch(() => {})
			}
		},
		true
	)

	window.addEventListener(
		'keyup',
		(e) => {
			if (e.code === PTT_KEY_CODE && pttPressed) {
				pttPressed = false
				chrome.runtime.sendMessage({ type: 'VOICE_PTT_UP' }).catch(() => {})
			}
		},
		true
	)
}
