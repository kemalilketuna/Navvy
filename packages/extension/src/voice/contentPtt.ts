/**
 * Content-script hold-to-talk bridge.
 *
 * The side panel only receives key events when focused, but the user is usually
 * looking at the page. This listens for the configured hold key on the page and
 * relays press/release to the side panel over the runtime message bus (the same
 * path Phase A's cancel-action uses).
 *
 * Guards: only active when voice + push-to-talk are enabled; ignores auto-repeat
 * and key presses while an editable element is focused.
 */
import { normalizeVoiceConfig } from './types'

function isEditableTarget(node: Element | null): boolean {
	if (!node) return false
	const el = node as HTMLElement
	const tag = el.tagName
	return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function initVoicePushToTalk(): void {
	let holdKey: string | null = null
	let pressed = false

	const apply = (raw: unknown) => {
		const cfg = normalizeVoiceConfig(raw)
		holdKey = cfg.enabled && cfg.pushToTalk ? cfg.holdKey : null
		if (!holdKey) pressed = false
	}

	chrome.storage.local.get('voiceConfig').then((r) => apply(r.voiceConfig))
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && changes.voiceConfig) apply(changes.voiceConfig.newValue)
	})

	window.addEventListener(
		'keydown',
		(e) => {
			if (!holdKey || e.key !== holdKey || e.repeat || pressed) return
			if (isEditableTarget(document.activeElement)) return
			pressed = true
			chrome.runtime.sendMessage({ type: 'VOICE_PTT_DOWN' }).catch(() => {})
		},
		true
	)

	window.addEventListener(
		'keyup',
		(e) => {
			if (!holdKey || e.key !== holdKey || !pressed) return
			pressed = false
			chrome.runtime.sendMessage({ type: 'VOICE_PTT_UP' }).catch(() => {})
		},
		true
	)
}
