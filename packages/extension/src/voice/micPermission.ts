/**
 * Microphone permission helpers.
 *
 * A Chrome side panel cannot display the mic permission prompt, so both Web
 * Speech recognition and getUserMedia fail there with "not-allowed" until the
 * permission is granted elsewhere. Permission is stored per extension origin,
 * so granting it from a page that opens in a tab (e.g. the settings page) also
 * unblocks the side panel.
 */
export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

export async function queryMicPermission(): Promise<MicPermissionState> {
	try {
		const status = await navigator.permissions.query({
			name: 'microphone' as PermissionName,
		})
		return status.state as MicPermissionState
	} catch {
		return 'unknown'
	}
}

/**
 * Trigger the browser permission prompt. Must run in a document that can show
 * it (a tab, not the side panel). Resolves once granted; rejects otherwise.
 */
export async function requestMicPermission(): Promise<void> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
	stream.getTracks().forEach((track) => track.stop())
}
