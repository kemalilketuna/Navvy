/**
 * Registry of speech (STT/TTS) providers, analogous to `providers.ts` for chat.
 *
 * STT and TTS providers are chosen independently (e.g. Deepgram STT + ElevenLabs
 * TTS). Each provider declares which directions it supports, its model/voice
 * presets, and how it authenticates. OpenAI-compatible providers can reuse the
 * user's existing chat credentials.
 */

export type VoiceProviderKey = 'webspeech' | 'openai' | 'groq' | 'elevenlabs' | 'deepgram'

/** Which concrete client implementation backs a provider. */
export type VoiceClientType = 'webspeech' | 'openai' | 'elevenlabs' | 'deepgram'

interface NamedOption {
	id: string
	label?: string
}

export interface VoiceProvider {
	key: VoiceProviderKey
	label: string
	clientType: VoiceClientType
	/** Fixed base URL for OpenAI-compatible audio endpoints. */
	baseURL?: string
	requiresApiKey: boolean
	/**
	 * OpenAI-compatible: if the active chat profile points at the same provider,
	 * its API key can be reused when no voice-specific key is set.
	 */
	reusesLlmCredentials?: boolean
	apiKeyURL?: string

	supportsStt: boolean
	sttModels: NamedOption[]
	defaultSttModel?: string

	supportsTts: boolean
	ttsModels: NamedOption[]
	defaultTtsModel?: string
	/** Static voice presets. Web Speech voices are discovered at runtime instead. */
	voices: NamedOption[]
	defaultVoice?: string
}

export const VOICE_PROVIDERS: VoiceProvider[] = [
	{
		key: 'webspeech',
		label: 'Web Speech API (browser, free)',
		clientType: 'webspeech',
		requiresApiKey: false,
		supportsStt: true,
		sttModels: [],
		supportsTts: true,
		ttsModels: [],
		voices: [],
	},
	{
		key: 'openai',
		label: 'OpenAI',
		clientType: 'openai',
		baseURL: 'https://api.openai.com/v1',
		requiresApiKey: true,
		reusesLlmCredentials: true,
		apiKeyURL: 'https://platform.openai.com/api-keys',
		supportsStt: true,
		sttModels: [{ id: 'gpt-4o-transcribe' }, { id: 'gpt-4o-mini-transcribe' }, { id: 'whisper-1' }],
		defaultSttModel: 'gpt-4o-mini-transcribe',
		supportsTts: true,
		ttsModels: [{ id: 'gpt-4o-mini-tts' }, { id: 'tts-1' }, { id: 'tts-1-hd' }],
		defaultTtsModel: 'gpt-4o-mini-tts',
		voices: [
			{ id: 'alloy' },
			{ id: 'ash' },
			{ id: 'ballad' },
			{ id: 'coral' },
			{ id: 'echo' },
			{ id: 'fable' },
			{ id: 'nova' },
			{ id: 'onyx' },
			{ id: 'sage' },
			{ id: 'shimmer' },
		],
		defaultVoice: 'alloy',
	},
	{
		key: 'groq',
		label: 'Groq (Whisper)',
		clientType: 'openai',
		baseURL: 'https://api.groq.com/openai/v1',
		requiresApiKey: true,
		reusesLlmCredentials: true,
		apiKeyURL: 'https://console.groq.com/keys',
		supportsStt: true,
		sttModels: [{ id: 'whisper-large-v3-turbo' }, { id: 'whisper-large-v3' }],
		defaultSttModel: 'whisper-large-v3-turbo',
		supportsTts: false,
		ttsModels: [],
		voices: [],
	},
	{
		key: 'elevenlabs',
		label: 'ElevenLabs',
		clientType: 'elevenlabs',
		requiresApiKey: true,
		apiKeyURL: 'https://elevenlabs.io/app/settings/api-keys',
		supportsStt: true,
		sttModels: [{ id: 'scribe_v1' }],
		defaultSttModel: 'scribe_v1',
		supportsTts: true,
		ttsModels: [
			{ id: 'eleven_multilingual_v2' },
			{ id: 'eleven_turbo_v2_5' },
			{ id: 'eleven_flash_v2_5' },
		],
		defaultTtsModel: 'eleven_multilingual_v2',
		voices: [
			{ id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel' },
			{ id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi' },
			{ id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah' },
			{ id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh' },
			{ id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam' },
		],
		defaultVoice: '21m00Tcm4TlvDq8ikWAM',
	},
	{
		key: 'deepgram',
		label: 'Deepgram',
		clientType: 'deepgram',
		requiresApiKey: true,
		apiKeyURL: 'https://console.deepgram.com/',
		supportsStt: true,
		sttModels: [{ id: 'nova-3' }, { id: 'nova-2' }],
		defaultSttModel: 'nova-3',
		supportsTts: true,
		ttsModels: [{ id: 'aura-2' }, { id: 'aura' }],
		defaultTtsModel: 'aura-2',
		voices: [
			{ id: 'aura-2-thalia-en', label: 'Thalia' },
			{ id: 'aura-2-andromeda-en', label: 'Andromeda' },
			{ id: 'aura-asteria-en', label: 'Asteria' },
			{ id: 'aura-luna-en', label: 'Luna' },
			{ id: 'aura-orion-en', label: 'Orion' },
		],
		defaultVoice: 'aura-2-thalia-en',
	},
]

export const VOICE_PROVIDERS_BY_KEY: Record<VoiceProviderKey, VoiceProvider> =
	VOICE_PROVIDERS.reduce(
		(acc, p) => {
			acc[p.key] = p
			return acc
		},
		{} as Record<VoiceProviderKey, VoiceProvider>
	)

export const STT_PROVIDERS = VOICE_PROVIDERS.filter((p) => p.supportsStt)
export const TTS_PROVIDERS = VOICE_PROVIDERS.filter((p) => p.supportsTts)
