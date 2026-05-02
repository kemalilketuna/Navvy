/**
 * Deepgram speech client.
 *
 * - STT (primary strength, low latency): POST /v1/listen with the raw audio
 *   bytes as the body. Transcript is at results.channels[0].alternatives[0].transcript.
 * - TTS (Aura): POST /v1/speak?model=aura-... with JSON { text }, returns audio.
 *
 * Auth uses the `Authorization: Token <key>` header. baseURL is fixed.
 */
import {
	type AudioClientConfig,
	type SttClient,
	type SynthesizeOptions,
	type TranscribeOptions,
	type TranscribeResult,
	type TtsClient,
	audioErrorFromResponse,
	resolveFetch,
} from './types'

const BASE_URL = 'https://api.deepgram.com/v1'

interface DeepgramListenResponse {
	results?: {
		channels?: { alternatives?: { transcript?: string }[] }[]
	}
}

export class DeepgramClient implements SttClient, TtsClient {
	private apiKey?: string
	private fetch: typeof globalThis.fetch

	constructor(config: AudioClientConfig) {
		this.apiKey = config.apiKey
		this.fetch = resolveFetch(config)
	}

	async transcribe(audio: Blob, opts: TranscribeOptions): Promise<TranscribeResult> {
		const params = new URLSearchParams({
			model: opts.model || 'nova-2',
			smart_format: 'true',
		})
		if (opts.language) params.set('language', opts.language)

		const response = await this.fetch(`${BASE_URL}/listen?${params.toString()}`, {
			method: 'POST',
			headers: {
				'Content-Type': audio.type || 'audio/webm',
				...(this.apiKey && { Authorization: `Token ${this.apiKey}` }),
			},
			body: audio,
			signal: opts.abortSignal,
		})
		if (!response.ok) throw await audioErrorFromResponse(response)
		const data = (await response.json()) as DeepgramListenResponse
		const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
		return { text }
	}

	async synthesize(text: string, opts: SynthesizeOptions): Promise<Blob> {
		const params = new URLSearchParams({ model: opts.voice || opts.model || 'aura-asteria-en' })
		const response = await this.fetch(`${BASE_URL}/speak?${params.toString()}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(this.apiKey && { Authorization: `Token ${this.apiKey}` }),
			},
			body: JSON.stringify({ text }),
			signal: opts.abortSignal,
		})
		if (!response.ok) throw await audioErrorFromResponse(response)
		return await response.blob()
	}
}
