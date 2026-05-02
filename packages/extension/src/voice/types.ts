import type { VoiceProviderKey } from '@/agent/voiceProviders'

/**
 * Voice conversation settings. UI-only: consumed by the side panel to build STT/TTS
 * clients and drive capture/playback. Never spread into the PageAgentCore constructor.
 *
 * Persisted under its own `chrome.storage.local` key (`voiceConfig`).
 */
export interface VoiceConfig {
	enabled: boolean
	sttProviderKey: VoiceProviderKey
	ttsProviderKey: VoiceProviderKey
	/** Empty string = use the provider's default model. */
	sttModel: string
	ttsModel: string
	voice: string
	autoSpeakResponses: boolean
	/** STT language hint (BCP-47). Defaults to the response language when unset. */
	language?: string
	/** Per-provider API keys for voice-only providers (ElevenLabs, Deepgram, …). */
	apiKeys: Partial<Record<VoiceProviderKey, string>>
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
	enabled: false,
	sttProviderKey: 'webspeech',
	ttsProviderKey: 'webspeech',
	sttModel: '',
	ttsModel: '',
	voice: '',
	autoSpeakResponses: true,
	apiKeys: {},
}

/** Coerce stored/unknown data into a complete VoiceConfig, filling defaults. */
export function normalizeVoiceConfig(raw: unknown): VoiceConfig {
	if (!raw || typeof raw !== 'object') return { ...DEFAULT_VOICE_CONFIG }
	const r = raw as Partial<VoiceConfig>
	return {
		...DEFAULT_VOICE_CONFIG,
		...r,
		apiKeys: { ...(r.apiKeys ?? {}) },
	}
}
