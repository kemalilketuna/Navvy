/**
 * ElevenLabs speech client.
 *
 * - TTS (primary strength): POST /v1/text-to-speech/{voiceId}, returns audio/mpeg.
 * - STT (Scribe): POST /v1/speech-to-text (multipart), model_id e.g. "scribe_v1".
 *
 * Auth uses the `xi-api-key` header (not Bearer). baseURL is fixed.
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

const BASE_URL = 'https://api.elevenlabs.io/v1'

export class ElevenLabsClient implements SttClient, TtsClient {
	private apiKey?: string
	private fetch: typeof globalThis.fetch

	constructor(config: AudioClientConfig) {
		this.apiKey = config.apiKey
		this.fetch = resolveFetch(config)
	}

	async transcribe(audio: Blob, opts: TranscribeOptions): Promise<TranscribeResult> {
		const form = new FormData()
		form.append('file', audio, 'audio.webm')
		form.append('model_id', opts.model || 'scribe_v1')
		if (opts.language) form.append('language_code', opts.language)

		const response = await this.fetch(`${BASE_URL}/speech-to-text`, {
			method: 'POST',
			headers: {
				...(this.apiKey && { 'xi-api-key': this.apiKey }),
			},
			body: form,
			signal: opts.abortSignal,
		})
		if (!response.ok) throw await audioErrorFromResponse(response)
		const data = (await response.json()) as { text?: string }
		return { text: data.text ?? '' }
	}

	async synthesize(text: string, opts: SynthesizeOptions): Promise<Blob> {
		const response = await this.fetch(
			`${BASE_URL}/text-to-speech/${encodeURIComponent(opts.voice)}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'audio/mpeg',
					...(this.apiKey && { 'xi-api-key': this.apiKey }),
				},
				body: JSON.stringify({
					text,
					model_id: opts.model || 'eleven_multilingual_v2',
				}),
				signal: opts.abortSignal,
			}
		)
		if (!response.ok) throw await audioErrorFromResponse(response)
		return await response.blob()
	}
}
