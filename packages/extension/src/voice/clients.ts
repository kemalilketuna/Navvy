/**
 * Build concrete STT/TTS clients and a VoiceController from VoiceConfig.
 *
 * Credential resolution: a voice-specific key (voiceConfig.apiKeys[provider])
 * wins; otherwise OpenAI-compatible providers reuse the active chat key when the
 * chat baseURL points at the same host.
 */
import {
	type AudioClientConfig,
	DeepgramClient,
	ElevenLabsClient,
	OpenAIAudioClient,
	type SttClient,
	type TtsClient,
} from '@page-agent/llms'

import {
	VOICE_PROVIDERS_BY_KEY,
	type VoiceClientType,
	type VoiceProvider,
} from '@/agent/voiceProviders'

import { VoiceController } from './VoiceController'
import type { VoiceConfig } from './types'

export interface LlmCredentials {
	baseURL: string
	apiKey?: string
}

function sameHost(a?: string, b?: string): boolean {
	if (!a || !b) return false
	try {
		return new URL(a).host === new URL(b).host
	} catch {
		return false
	}
}

function credentialsFor(
	provider: VoiceProvider,
	voiceConfig: VoiceConfig,
	llm: LlmCredentials
): AudioClientConfig {
	const explicit = voiceConfig.apiKeys[provider.key]
	if (provider.reusesLlmCredentials && !explicit && sameHost(provider.baseURL, llm.baseURL)) {
		return { baseURL: provider.baseURL, apiKey: llm.apiKey }
	}
	return { baseURL: provider.baseURL, apiKey: explicit }
}

function makeClient(
	clientType: VoiceClientType,
	creds: AudioClientConfig
): (SttClient & TtsClient) | null {
	switch (clientType) {
		case 'openai':
			return new OpenAIAudioClient(creds)
		case 'elevenlabs':
			return new ElevenLabsClient(creds)
		case 'deepgram':
			return new DeepgramClient(creds)
		case 'webspeech':
			return null
	}
}

/**
 * Construct a VoiceController for the current config, or null when voice is
 * disabled. STT and TTS may use different providers and credentials.
 */
export function createVoiceController(
	voiceConfig: VoiceConfig,
	llm: LlmCredentials
): VoiceController | null {
	if (!voiceConfig.enabled) return null

	const sttProvider = VOICE_PROVIDERS_BY_KEY[voiceConfig.sttProviderKey]
	const ttsProvider = VOICE_PROVIDERS_BY_KEY[voiceConfig.ttsProviderKey]
	if (!sttProvider || !ttsProvider) return null

	const sttClient = makeClient(
		sttProvider.clientType,
		credentialsFor(sttProvider, voiceConfig, llm)
	)
	const ttsClient = makeClient(
		ttsProvider.clientType,
		credentialsFor(ttsProvider, voiceConfig, llm)
	)

	return new VoiceController({
		sttProvider,
		ttsProvider,
		sttClient,
		ttsClient,
		sttModel: voiceConfig.sttModel,
		ttsModel: voiceConfig.ttsModel,
		voice: voiceConfig.voice,
		language: voiceConfig.language,
	})
}
