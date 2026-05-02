/**
 * VoiceController — unifies microphone capture, transcription, and speech playback
 * across network providers (OpenAI/ElevenLabs/Deepgram) and the browser Web Speech
 * API behind one start/stop/speak surface.
 *
 * Lives in the side-panel document. The side panel subscribes to `statechange` to
 * render listening/transcribing/speaking indicators.
 */
import type { SttClient, TtsClient } from '@page-agent/llms'

import type { VoiceProvider } from '@/agent/voiceProviders'

import { MicRecorder } from './MicRecorder'
import { WebSpeechRecognizer, cancelWebSpeechSpeak, webSpeechSpeak } from './webspeech'

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'speaking'

export interface VoiceControllerOptions {
	sttProvider: VoiceProvider
	ttsProvider: VoiceProvider
	/** null when the STT provider is Web Speech (capture is self-contained). */
	sttClient: SttClient | null
	ttsClient: TtsClient | null
	sttModel: string
	ttsModel: string
	voice: string
	language?: string
}

export class VoiceController extends EventTarget {
	state: VoiceState = 'idle'

	private readonly opts: VoiceControllerOptions
	private readonly usingWebSpeechStt: boolean
	private readonly usingWebSpeechTts: boolean
	private readonly recorder = new MicRecorder()
	private readonly recognizer = new WebSpeechRecognizer()
	private listening = false
	private audioEl: HTMLAudioElement | null = null
	private audioUrl: string | null = null

	constructor(opts: VoiceControllerOptions) {
		super()
		this.opts = opts
		this.usingWebSpeechStt = opts.sttProvider.clientType === 'webspeech'
		this.usingWebSpeechTts = opts.ttsProvider.clientType === 'webspeech'
	}

	get isListening(): boolean {
		return this.listening
	}

	private setState(state: VoiceState): void {
		if (this.state === state) return
		this.state = state
		this.dispatchEvent(new CustomEvent('statechange', { detail: state }))
	}

	/** Begin capturing speech. Stops any in-progress playback first (barge-in). */
	async startListening(): Promise<void> {
		if (this.listening) return
		this.cancelSpeaking()
		this.listening = true
		try {
			if (this.usingWebSpeechStt) {
				this.recognizer.start(this.opts.language)
			} else {
				await this.recorder.start()
			}
			this.setState('recording')
		} catch (error) {
			this.listening = false
			this.setState('idle')
			throw error
		}
	}

	/** Stop capturing and resolve the transcript. Returns '' if not listening. */
	async stopListening(): Promise<string> {
		if (!this.listening) return ''
		this.listening = false

		if (this.usingWebSpeechStt) {
			this.setState('transcribing')
			try {
				return await this.recognizer.stop()
			} finally {
				this.setState('idle')
			}
		}

		let blob: Blob
		try {
			blob = await this.recorder.stop()
		} catch (error) {
			this.setState('idle')
			throw error
		}
		this.setState('transcribing')
		try {
			if (!this.opts.sttClient) return ''
			const result = await this.opts.sttClient.transcribe(blob, {
				model: this.opts.sttModel || this.opts.sttProvider.defaultSttModel || '',
				language: this.opts.language,
			})
			return result.text.trim()
		} finally {
			this.setState('idle')
		}
	}

	/** Abort capture without transcribing (e.g. user cancelled). */
	cancelListening(): void {
		if (!this.listening) return
		this.listening = false
		if (this.usingWebSpeechStt) this.recognizer.abort()
		else this.recorder.cancel()
		this.setState('idle')
	}

	/** Speak text. Resolves when playback finishes (or is barged-in). */
	async speak(text: string): Promise<void> {
		const trimmed = text.trim()
		if (!trimmed) return
		this.cancelSpeaking()
		this.setState('speaking')
		try {
			if (this.usingWebSpeechTts) {
				await webSpeechSpeak(trimmed, { voice: this.opts.voice, lang: this.opts.language })
			} else if (this.opts.ttsClient) {
				const blob = await this.opts.ttsClient.synthesize(trimmed, {
					model: this.opts.ttsModel || this.opts.ttsProvider.defaultTtsModel || '',
					voice: this.opts.voice || this.opts.ttsProvider.defaultVoice || '',
				})
				await this.playBlob(blob)
			}
		} finally {
			if (this.state === 'speaking') this.setState('idle')
		}
	}

	/** Stop any in-progress playback (barge-in / new chat). */
	cancelSpeaking(): void {
		if (this.usingWebSpeechTts) cancelWebSpeechSpeak()
		if (this.audioEl) {
			this.audioEl.onended = null
			this.audioEl.onerror = null
			this.audioEl.pause()
			this.audioEl = null
		}
		if (this.audioUrl) {
			URL.revokeObjectURL(this.audioUrl)
			this.audioUrl = null
		}
	}

	dispose(): void {
		this.cancelSpeaking()
		this.recorder.cancel()
		this.recognizer.abort()
		this.listening = false
	}

	private playBlob(blob: Blob): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.audioUrl = URL.createObjectURL(blob)
			const audio = new Audio(this.audioUrl)
			this.audioEl = audio
			audio.onended = () => {
				this.cancelSpeaking()
				resolve()
			}
			audio.onerror = () => {
				this.cancelSpeaking()
				reject(new Error('Failed to play synthesized audio.'))
			}
			audio.play().catch(reject)
		})
	}
}
