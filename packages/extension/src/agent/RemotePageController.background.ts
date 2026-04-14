/**
 * background logics for RemotePageController
 * - redirect messages from RemotePageController(Agent, extension pages) to ContentScript
 */

export function handlePageControlMessage(
	message: { type: 'PAGE_CONTROL'; action: string; payload: any; targetTabId: number },
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): true | undefined {
	const PREFIX = '[RemotePageController.background]'

	const debug = console.debug.bind(console, `\x1b[90m${PREFIX}\x1b[0m`)

	const { action, payload, targetTabId } = message

	if (action === 'get_my_tab_id') {
		debug('get_my_tab_id', sender.tab?.id)
		sendResponse({ tabId: sender.tab?.id || null })
		return
	}

	// proxy to content script
	chrome.tabs
		.sendMessage(targetTabId, {
			type: 'PAGE_CONTROL',
			action,
			payload,
		})
		.then((result) => {
			sendResponse(result)
		})
		.catch((error) => {
			const message = error instanceof Error ? error.message : String(error)

			// Expected when the content script tears down mid-response — e.g. click_element
			// triggers navigation, or the target tab has no content script loaded yet.
			// Surface it as a structured failure rather than a noisy console.error.
			if (isDisconnectError(message)) {
				debug(action, 'content script disconnected:', message)
				sendResponse({ success: false, disconnected: true, error: message })
				return
			}

			console.error(PREFIX, error)
			sendResponse({ success: false, error: message })
		})

	return true // async response
}

function isDisconnectError(message: string): boolean {
	return (
		message.includes('message channel closed') ||
		message.includes('Receiving end does not exist') ||
		message.includes('Could not establish connection')
	)
}
