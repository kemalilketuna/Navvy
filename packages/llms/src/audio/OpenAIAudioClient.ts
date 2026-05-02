/**
 * OpenAI-compatible speech client.
 *
 * - STT: POST {baseURL}/audio/transcriptions (multipart). Works with OpenAI
 *   (gpt-4o-transcribe / whisper-1), Groq (whisper-large-v3), and any
 *   OpenAI-compatible gateway — just swap the baseURL.
 * - TTS: POST {baseURL}/audio/speech (JSON) with tts-1 / gpt-4o-mini-tts.
 *
 * Reuses the chat provider's credentials, so an existing OpenAI/Groq key works
 * for audio without re-entry.
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

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

function audioFileName(audio: Blob): string {
	if (audio.type.includes('webm')) return 'audio.webm'
	if (audio.type.includes('ogg')) return 'audio.ogg'
	if (audio.type.includes('mp4') || audio.type.includes('m4a')) return 'audio.mp4'
	if (audio.type.includes('wav')) return 'audio.wav'
	if (audio.type.includes('mpeg') || audio.type.includes('mp3')) return 'audio.mp3'
	return 'audio.webm'
}

export class OpenAIAudioClient implements SttClient, TtsClient {
	private baseURL: string
	private apiKey?: string
	private fetch: typeof globalThis.fetch

	constructor(config: AudioClientConfig) {
		this.baseURL = (config.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
		this.apiKey = config.apiKey
		this.fetch = resolveFetch(config)
	}

	async transcribe(audio: Blob, opts: TranscribeOptions): Promise<TranscribeResult> {
		const form = new FormData()
		form.append('file', audio, audioFileName(audio))
		form.append('model', opts.model)
		if (opts.language) form.append('language', opts.language)
		form.append('response_format', 'json')

		const response = await this.fetch(`${this.baseURL}/audio/transcriptions`, {
			method: 'POST',
			headers: {
				...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
			},
			body: form,
			signal: opts.abortSignal,
		})
		if (!response.ok) throw await audioErrorFromResponse(response)
		const data = (await response.json()) as { text?: string }
		return { text: data.text ?? '' }
	}

	async synthesize(text: string, opts: SynthesizeOptions): Promise<Blob> {
		const response = await this.fetch(`${this.baseURL}/audio/speech`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
			},
			body: JSON.stringify({
				model: opts.model,
				voice: opts.voice,
				input: text,
				response_format: 'mp3',
			}),
			signal: opts.abortSignal,
		})
		if (!response.ok) throw await audioErrorFromResponse(response)
		return await response.blob()
	}
}
