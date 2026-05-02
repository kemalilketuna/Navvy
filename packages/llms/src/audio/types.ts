/**
 * Provider-agnostic speech clients (STT / TTS).
 *
 * Mirrors the OpenAIClient pattern in this package: a client is constructed once
 * with credentials, then invoked per request with the model / voice / language
 * picked by the caller. Concrete implementations live alongside this file and are
 * selected by the extension's voice provider registry.
 *
 * Network providers (OpenAI-compatible, ElevenLabs, Deepgram) implement these
 * interfaces directly. The browser Web Speech API does not fit a Blob-in/Blob-out
 * shape (it captures and plays audio itself), so it is implemented in the
 * extension's capture layer rather than here.
 */

export interface AudioClientConfig {
	/** Base URL for OpenAI-compatible providers. Ignored by fixed-endpoint providers. */
	baseURL?: string
	apiKey?: string
	/** Custom fetch (proxy / header injection). Defaults to global fetch. */
	customFetch?: typeof globalThis.fetch
}

export interface TranscribeOptions {
	model: string
	/** BCP-47 language hint, e.g. "en", "tr". Optional; improves accuracy. */
	language?: string
	abortSignal?: AbortSignal
}

export interface TranscribeResult {
	text: string
}

export interface SynthesizeOptions {
	model: string
	/** Provider voice id, e.g. "alloy" (OpenAI) or an ElevenLabs voice id. */
	voice: string
	abortSignal?: AbortSignal
}

/** Speech-to-text: audio in, text out. */
export interface SttClient {
	transcribe(audio: Blob, opts: TranscribeOptions): Promise<TranscribeResult>
}

/** Text-to-speech: text in, playable audio Blob out. */
export interface TtsClient {
	synthesize(text: string, opts: SynthesizeOptions): Promise<Blob>
}

/**
 * Error thrown by speech clients. Carries the HTTP status so callers can surface
 * auth / quota hints the same way chat errors are hinted.
 */
export class AudioError extends Error {
	status?: number
	constructor(message: string, status?: number) {
		super(message)
		this.name = 'AudioError'
		this.status = status
	}
}

/** Build a human-readable message from a failed audio HTTP response. */
export async function audioErrorFromResponse(response: Response): Promise<AudioError> {
	let detail = response.statusText
	try {
		const text = await response.text()
		if (text) {
			try {
				const json = JSON.parse(text)
				detail =
					json?.error?.message ?? json?.message ?? json?.detail ?? json?.err ?? text.slice(0, 300)
			} catch {
				detail = text.slice(0, 300)
			}
		}
	} catch {
		// keep statusText
	}
	const prefix =
		response.status === 401 || response.status === 403
			? 'Authentication failed'
			: response.status === 402 || response.status === 429
				? 'Quota or rate limit reached'
				: `Request failed (HTTP ${response.status})`
	return new AudioError(`${prefix}: ${detail}`, response.status)
}

export function resolveFetch(config: AudioClientConfig): typeof globalThis.fetch {
	return (config.customFetch ?? fetch).bind(globalThis)
}
