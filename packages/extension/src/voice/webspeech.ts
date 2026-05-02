/**
 * Browser Web Speech API wrappers (zero-network STT/TTS fallback).
 *
 * Unlike the network clients, recognition captures and plays audio itself, so it
 * cannot conform to the Blob-in/Blob-out SttClient/TtsClient interfaces. These
 * thin wrappers expose a start/stop shape the VoiceController can drive uniformly.
 *
 * Note: Chrome's SpeechRecognition routes audio to Google servers, so "offline"
 * is not guaranteed and availability varies by browser/locale.
 */
import { AudioError } from '@page-agent/llms'

// Minimal typings — SpeechRecognition is not in the standard DOM lib.
interface SpeechRecognitionLike {
	lang: string
	continuous: boolean
	interimResults: boolean
	maxAlternatives: number
	onresult: ((event: any) => void) | null
	onerror: ((event: any) => void) | null
	onend: (() => void) | null
	start(): void
	stop(): void
	abort(): void
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
	const w = window as any
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Map a SpeechRecognition error code to an actionable message. */
function webSpeechErrorMessage(code?: string): string {
	switch (code) {
		case 'not-allowed':
		case 'service-not-allowed':
			return 'Microphone access is blocked. Allow microphone access for the extension, then try again.'
		case 'audio-capture':
			return 'No microphone was found. Connect a microphone and try again.'
		case 'network':
			return 'Speech recognition needs an internet connection (Web Speech uses an online service).'
		case 'language-not-supported':
			return 'The selected language is not supported for speech recognition. Try "Auto" in voice settings.'
		default:
			return `Speech recognition error: ${code ?? 'unknown'}`
	}
}

export function webSpeechSttSupported(): boolean {
	return getRecognitionCtor() !== null
}

export function webSpeechTtsSupported(): boolean {
	return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Continuous recognizer: start() begins listening, stop() resolves the transcript. */
export class WebSpeechRecognizer {
	private rec: SpeechRecognitionLike | null = null
	private finalText = ''
	private done: Promise<string> | null = null
	private resolveDone: ((t: string) => void) | null = null
	private rejectDone: ((e: Error) => void) | null = null

	start(lang?: string): void {
		const Ctor = getRecognitionCtor()
		if (!Ctor) throw new AudioError('Speech recognition is not supported in this browser.')

		this.finalText = ''
		const rec = new Ctor()
		if (lang) rec.lang = lang
		rec.continuous = true
		rec.interimResults = false
		rec.maxAlternatives = 1
		this.done = new Promise<string>((resolve, reject) => {
			this.resolveDone = resolve
			this.rejectDone = reject
		})
		rec.onresult = (event: any) => {
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i]
				if (result.isFinal) this.finalText += result[0].transcript
			}
		}
		rec.onerror = (event: any) => {
			// "no-speech" / "aborted" are benign — resolve with whatever we have.
			if (event?.error === 'no-speech' || event?.error === 'aborted') {
				this.resolveDone?.(this.finalText.trim())
				return
			}
			this.rejectDone?.(new AudioError(webSpeechErrorMessage(event?.error)))
		}
		rec.onend = () => this.resolveDone?.(this.finalText.trim())
		this.rec = rec
		rec.start()
	}

	async stop(): Promise<string> {
		if (!this.rec || !this.done) return ''
		try {
			this.rec.stop()
		} catch {
			// already stopped
		}
		const text = await this.done
		this.rec = null
		this.done = null
		return text
	}

	abort(): void {
		try {
			this.rec?.abort()
		} catch {
			// ignore
		}
		this.rec = null
		this.done = null
	}
}

export function webSpeechSpeak(
	text: string,
	opts: { voice?: string; lang?: string }
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const synth = window.speechSynthesis
		if (!synth) {
			reject(new AudioError('Speech synthesis is not supported in this browser.'))
			return
		}
		synth.cancel()
		const utterance = new SpeechSynthesisUtterance(text)
		if (opts.lang) utterance.lang = opts.lang
		if (opts.voice) {
			const match = synth
				.getVoices()
				.find((v) => v.name === opts.voice || v.voiceURI === opts.voice)
			if (match) utterance.voice = match
		}
		utterance.onend = () => resolve()
		utterance.onerror = (event) => {
			// "interrupted"/"canceled" happen on barge-in — treat as a normal stop.
			if (event.error === 'interrupted' || event.error === 'canceled') resolve()
			else reject(new AudioError(`Speech synthesis error: ${event.error}`))
		}
		synth.speak(utterance)
	})
}

export function cancelWebSpeechSpeak(): void {
	window.speechSynthesis?.cancel()
}
