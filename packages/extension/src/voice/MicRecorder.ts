/**
 * Microphone capture via getUserMedia + MediaRecorder, for network STT providers.
 *
 * Runs in the side-panel document (a real page that can prompt for mic access).
 * Produces a webm/opus (or best-available) Blob to hand to an SttClient.
 */
import { AudioError } from '@page-agent/llms'

const PREFERRED_MIME_TYPES = [
	'audio/webm;codecs=opus',
	'audio/webm',
	'audio/ogg;codecs=opus',
	'audio/mp4',
]

function pickMimeType(): string {
	if (typeof MediaRecorder === 'undefined') return ''
	for (const type of PREFERRED_MIME_TYPES) {
		if (MediaRecorder.isTypeSupported(type)) return type
	}
	return ''
}

export class MicRecorder {
	private stream: MediaStream | null = null
	private recorder: MediaRecorder | null = null
	private chunks: Blob[] = []

	async start(): Promise<void> {
		if (!navigator.mediaDevices?.getUserMedia) {
			throw new AudioError('Microphone capture is not available in this context.')
		}
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
		} catch (error) {
			const name = (error as Error)?.name
			if (name === 'NotAllowedError' || name === 'SecurityError') {
				throw new AudioError('Microphone permission was denied.')
			}
			throw new AudioError(`Could not access the microphone: ${(error as Error)?.message ?? name}`)
		}

		const mimeType = pickMimeType()
		this.chunks = []
		this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
		this.recorder.ondataavailable = (event) => {
			if (event.data.size > 0) this.chunks.push(event.data)
		}
		this.recorder.start()
	}

	stop(): Promise<Blob> {
		return new Promise<Blob>((resolve, reject) => {
			const recorder = this.recorder
			if (!recorder) {
				reject(new AudioError('Not recording.'))
				return
			}
			recorder.onstop = () => {
				const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' })
				this.cleanup()
				resolve(blob)
			}
			try {
				recorder.stop()
			} catch (error) {
				this.cleanup()
				reject(new AudioError(`Failed to stop recording: ${(error as Error)?.message}`))
			}
		})
	}

	cancel(): void {
		try {
			this.recorder?.stop()
		} catch {
			// ignore
		}
		this.cleanup()
	}

	get recording(): boolean {
		return this.recorder?.state === 'recording'
	}

	private cleanup(): void {
		this.stream?.getTracks().forEach((track) => track.stop())
		this.stream = null
		this.recorder = null
	}
}
